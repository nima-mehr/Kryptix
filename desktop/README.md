# Kryptix Desktop

Desktop version of **Kryptix** built with **Tauri 2 + React + TypeScript**.

## Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop shell**: Tauri 2 (Rust)
- **Goal**: Share as much pure TypeScript logic as possible with the Expo mobile app (encryption, `.kryptix` format, types, vault models)

## Prerequisites

### All platforms
- Node.js 20+
- Rust (stable) — install from https://rustup.rs

### Windows
- Visual Studio Build Tools (C++ workload)
- WebView2 (usually already installed)

### Linux
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

See: https://tauri.app/start/prerequisites/

## Setup & Run

```bash
cd desktop
npm install
npm run tauri dev
```

Or:

```bash
npx tauri dev
```

## Build

```bash
npm run tauri build
```

## Project layout

```
desktop/
├── src/                 # React frontend
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── src-tauri/           # Rust / Tauri
│   ├── src/
│   ├── tauri.conf.json
│   └── Cargo.toml
├── package.json
└── vite.config.ts
```

## Next steps

1. Extract shared core (encryption, kryptixFormat, types)
2. Implement secure storage (OS keychain)
3. Build desktop-optimized vault UI
4. Wire `.kryptix` import/export
5. Auto-lock + optional system tray

- Identifier: `com.kryptix.app`
- Default window: 1100×750
