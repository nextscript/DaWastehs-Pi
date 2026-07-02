Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """C:\Program Files\nodejs\node.exe"" ""C:\Users\Sebas\.pi\agent\npm\node_modules\pi-intercom\node_modules\tsx\dist\cli.mjs"" ""C:\Users\Sebas\.pi\agent\npm\node_modules\pi-intercom\broker\broker.ts""", 0, False
Set WshShell = Nothing
