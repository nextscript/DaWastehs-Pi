import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ALARM_PATH = join(homedir(), ".pi", "agent", "extensions", "audio", "alarm.mp3");
const ALARM_VOLUME = 30;
const ALARM_TIMEOUT_MS = 30_000;
const USER_INPUT_TOOL_NAMES = new Set(["ask_user_question"]);

let alarmProcess: ChildProcess | null = null;
let alarmEnabled = true;
let lastAlarmError: string | null = null;

function rememberError(error: unknown): void {
  lastAlarmError = error instanceof Error ? error.message : String(error);
}

function psString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildPowerShellPlayerScript(filePath: string): string {
  // PresentationCore/System.Windows.Media.MediaPlayer can play mp3 on a stock
  // Windows install. This is the fallback for systems without ffplay/ffmpeg.
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
$player = [System.Windows.Media.MediaPlayer]::new()
$player.Open([System.Uri]::new(${psString(filePath)}))
$player.Volume = ${ALARM_VOLUME / 100}
$player.Play()
$deadline = [DateTime]::UtcNow.AddMilliseconds(${ALARM_TIMEOUT_MS})
while (-not $player.NaturalDuration.HasTimeSpan -and [DateTime]::UtcNow -lt $deadline) {
  Start-Sleep -Milliseconds 50
}
if ($player.NaturalDuration.HasTimeSpan) {
  $end = [DateTime]::UtcNow.Add($player.NaturalDuration.TimeSpan).AddMilliseconds(500)
  if ($end -gt $deadline) { $end = $deadline }
  while ([DateTime]::UtcNow -lt $end) {
    Start-Sleep -Milliseconds 100
  }
} else {
  Start-Sleep -Seconds 5
}
$player.Close()
`;
}

function startProcess(
  command: string,
  args: string[],
  handlers: {
    onSpawn?: () => void;
    onError?: (error: Error) => void;
    onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
  } = {},
): ChildProcess | null {
  let child: ChildProcess;

  try {
    child = spawn(command, args, { stdio: "ignore", windowsHide: true });
  } catch (error) {
    handlers.onError?.(error as Error);
    return null;
  }

  const timeout = setTimeout(() => {
    if (!child.killed) child.kill("SIGTERM");
  }, ALARM_TIMEOUT_MS);

  child.once("spawn", () => {
    handlers.onSpawn?.();
  });

  child.once("error", (error) => {
    clearTimeout(timeout);
    if (alarmProcess === child) alarmProcess = null;
    handlers.onError?.(error);
  });

  child.once("exit", (code, signal) => {
    clearTimeout(timeout);
    if (alarmProcess === child) alarmProcess = null;
    handlers.onExit?.(code, signal);
  });

  alarmProcess = child;
  return child;
}

function startWindowsPlayer(): boolean {
  if (process.platform !== "win32") return false;

  const encodedCommand = Buffer.from(buildPowerShellPlayerScript(ALARM_PATH), "utf16le").toString("base64");
  const child = startProcess(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-EncodedCommand", encodedCommand],
    {
      onError: rememberError,
      onExit: (code, signal) => {
        if (signal === null && code !== null && code !== 0) {
          lastAlarmError = `PowerShell audio player exited with code ${code}`;
        }
      },
    },
  );

  return child !== null;
}

function startFfplayOrFallback(): void {
  let spawned = false;
  let fallbackStarted = false;

  const startFallback = (error: unknown) => {
    if (fallbackStarted) return;
    fallbackStarted = true;

    if (!startWindowsPlayer()) {
      rememberError(error);
    }
  };

  startProcess(
    "ffplay",
    ["-nodisp", "-autoexit", "-loglevel", "quiet", "-volume", String(ALARM_VOLUME), ALARM_PATH],
    {
      onSpawn: () => {
        spawned = true;
      },
      onError: startFallback,
      onExit: (code, signal) => {
        if (spawned && signal === null && code !== null && code !== 0) {
          startFallback(new Error(`ffplay exited with code ${code}`));
        }
      },
    },
  );
}

function playAlarm(): void {
  if (!alarmEnabled) return;

  stopAlarm();
  lastAlarmError = null;

  if (!existsSync(ALARM_PATH)) {
    lastAlarmError = `Alarm-Datei fehlt: ${ALARM_PATH}`;
    return;
  }

  startFfplayOrFallback();
}

function stopAlarm(): void {
  const child = alarmProcess;
  alarmProcess = null;

  if (child && !child.killed) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Prozess vielleicht schon tot
    }
  }
}

function shouldPlayForMode(ctx: unknown): boolean {
  const mode = (ctx as { mode?: string }).mode;
  return mode === "tui" || mode === "rpc";
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_start", async (_event, ctx) => {
    // Neuer Prompt → laufenden Sound stoppen
    if (shouldPlayForMode(ctx)) {
      stopAlarm();
    }
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    // Tools wie ask_user_question blockieren auf Userinput, bevor agent_end feuert.
    if (shouldPlayForMode(ctx) && USER_INPUT_TOOL_NAMES.has(event.toolName)) {
      playAlarm();
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    // Agent fertig und Pi wartet wieder auf Eingabe → Sound abspielen
    if (shouldPlayForMode(ctx)) {
      playAlarm();
    }
  });

  pi.on("session_shutdown", async () => {
    stopAlarm();
  });

  pi.registerCommand("alarm-sounds", {
    description: "Alarm-Sound aktivieren/deaktivieren/testen (on/off/test)",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();

      if (arg === "on") {
        alarmEnabled = true;
        ctx.ui.notify("Alarm-Sound aktiviert", "info");
      } else if (arg === "off") {
        alarmEnabled = false;
        stopAlarm();
        ctx.ui.notify("Alarm-Sound deaktiviert", "info");
      } else if (arg === "test") {
        playAlarm();
        ctx.ui.notify(
          lastAlarmError ? `Alarm-Test konnte nicht starten: ${lastAlarmError}` : "Alarm-Test gestartet",
          lastAlarmError ? "error" : "info",
        );
      } else {
        ctx.ui.notify(
          `Nutzung: /alarm-sounds on|off|test (aktuell: ${alarmEnabled ? "on" : "off"})`,
          "warning",
        );
      }
    },
  });
}
