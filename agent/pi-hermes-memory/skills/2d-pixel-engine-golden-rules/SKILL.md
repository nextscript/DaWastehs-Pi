---
name: "2d-pixel-engine-golden-rules"
description: "Best Practices für die Architektur und Entwicklung von 2D-Pixel-Art-Game-Engines."
version: 2
created: "2026-05-29"
updated: "2026-06-29"
---
## When to Use
Wenn die Architektur, der Game Loop oder das Rendering für ein 2D-Pixel-Art-Spiel oder eine eigene Engine entworfen oder optimiert wird.

## Procedure
1. Implementierung eines 'Fixed Update Timestep': Trennung von Logik-Update (festes Intervall, z.B. 60Hz) und Render-Loop (so schnell wie möglich) mit einem Akkumulator und Interpolation der Positionen zwischen den letzten zwei States.
2. Nutzung einer ECS-Architektur (Entity Component System): Bevorzugung von Komposition gegenüber Vererbung, um Daten lokal im Speicher zu halten (Cache-Friendliness) und Flexibilität zu maximieren.
3. Implementierung von Object Pooling: Vorallokation von Pools für häufig genutzte Objekte (Bullets, Particles, Enemies), um dynamische Allokationen während des Gameplays zu eliminieren.
4. Pixel-Perfect Rendering Pipeline: Rendering in einen internen Low-Res Buffer (z.B. 320x180), der anschließend mit einem ganzzahligen Faktor (Integer Scaling) auf die Bildschirmauflösung hochskaliert wird.
5. Kamera- und Positions-Rounding: Anwendung von floor() oder round() auf die finalen Rendering-Koordinaten der Kamera und der Entities, um 'Texture Bleeding' und 'Jitter' zu vermeiden.
6. Sprite-Sheet Optimierung: Verwendung von Texture Padding oder Edge Extrusion, um sicherzustellen, dass das bilinear/nearest Filtering nicht in benachbarte Sprites greift.

## Pitfalls
- Framerate-abhängige Physik: Nutzung von 'position += speed * delta_time' führt zu inkonsistentem Verhalten bei unterschiedlichen FPS.
- OOP-Vererbungshöllen: Tiefe Hierarchien (z.B. Entity -> Actor -> Pawn -> Player) machen den Code starr und schwer wartbar.
- Memory Churn: Ständiges Instanziieren und Zerstören von Projektilen oder Partikeln im Game Loop führt zu Garbage Collection Spikes (Lags).
- Subpixel-Jitter: Rendering von Entities an Floating-Point-Positionen ohne Rundung führt zu zitternden Pixeln bei langsamen Bewegungen.
- Texture Bleeding: Fehlende Padding-Pixel in Sprite-Sheets verursachen farbige Artefakte an den Kanten beim Sampling.

## Verification
1. Determinismus-Check: Läuft die Physik/Logik bei 30fps exakt so schnell und stabil wie bei 144fps?
2. Jitter-Test: Bewege die Kamera extrem langsam über ein statisches Objekt; die Pixel müssen stabil bleiben und nicht 'springen'.
3. Profiling: Überprüfung des Memory-Profilers auf 'Zero Allocations' während einer stabilen Gameplay-Sequenz (keine GC-Spikes).
4. Scaling-Test: Prüfung des Bildes bei verschiedenen Fenstergrößen auf quadratische Pixel (keine verzerrten Rechtecke).

## Hardware-Tuning (optional)
Optional an dieses System anpassen, wenn maximale Performance gewünscht ist:

- **Hybrid-Job-System**: Auf dem Intel Core Ultra 9 285K (8 P- + 16 E-Cores, kein HT) den Fixed-Update-Timestep und den Render-Loop auf P-Cores (Lion Cove) binden; Asset-Loading, Audio-Decoding und Logging auf E-Cores (Skymont) über ein Work-Stealing-Executor. `SetThreadSelectedCpuSets` für Affinität nutzen.
- **SIMD-Sprite-Blits**: Sprite-Blitting/Pixel-Kopier-Pfade mit AVX2 (`__m256i`, 32 Bytes pro Vektor = 32 Pixel bei 8-bit) vektorisieren. **KEIN AVX-512** — der 285K hat nur AVX2/VNNI.
- **GPU-Renderer**: Für GPU-beschleunigte Post-Processing (CRT-Shaders, Bloom) die AMD Radeon RX 9070 XT (16 GB, RDNA4) via D3D12/Vulkan ansprechen; die AI PRO R9700 (32 GB) bleibt freit für parallel laufende ML-Workloads.
- **Cache-Ziel**: Tile-/Tilemap-Daten ≤ 32 KB (P-Core L1d 48 KB) halten, SoA für parallele Komponenten-Updates.