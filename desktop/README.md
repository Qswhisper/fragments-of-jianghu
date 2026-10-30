# Windows build

The Windows target bundles Electron and the complete current PC game into one offline NSIS installer. It does not require an installed browser or WebView runtime.

```powershell
npm ci --prefix desktop --ignore-scripts
npm run package:windows
```

`scripts/build-windows.mjs` creates a fresh directory under `output/windows-build/`. It checks that the root, desktop package and current offline game's versions match. Rebuild the existing PC bundle first when game files change; keep `desktop/package.json` in sync with the root version. `--dir` produces only an unpacked application; the default produces the complete x64 installer. No publish or automatic-update step runs.

Game bytes come from `output/offline-package/江湖残卷_1.0正式版_PC` without altering that folder. A byte/size manifest bounds the `jianghu://game` protocol and supports local audio ranges. The production renderer has Node integration disabled, context isolation and sandbox enabled, no remote navigation, and no network game resources.

Windows saves use `%APPDATA%/FragmentsOfJianghu` and the stable `jianghu://game` origin. Browser and Android saves remain independent. Installation-path changes and upgrades retain the Windows profile; uninstall does not request deleting application data.

Actual EXE verification uses `tests/windows-app.mjs --exe <packaged EXE>`. `--kgame-verify` keeps the window hidden/muted and requires an isolated `--kgame-data` directory. Hidden native windows may throttle RAF; tests wait for the game's reading condition and do not use those timings as foreground FPS. `npm run test:windows` checks protocol boundaries and range handling. Installer validation additionally extracts the exact embedded archive and compares all game bytes; silent installation, shortcuts and registry changes are separate coverage.

Pinned dependencies are recorded in `package-lock.json`. The accepted Android icon is only converted to ICO sizes. Runtime licenses remain in the delivered folder; see [desktop notices](THIRD_PARTY_NOTICES.md). Current outputs and hashes: [release identity](../docs/RELEASE-IDENTITY.md).
