# Kryptix

**Your Offline Password Manager**

Kryptix is a privacy-first, fully offline password manager built with React Native and Expo. All data stays on your device — no cloud, no accounts, no tracking.

![Login Screen](docs/screenshots/login.png)

## Features

- **Master password + biometrics** — Unlock with your master password or fingerprint / Face ID
- **Passwords vault** — Store name, URL, username, password, and notes. Generate strong passwords, import/export, favorites, and categories
- **Recovery phrases** — Safely store 12/24-word seed phrases (MetaMask, Ledger, etc.) with show/copy/edit/delete
- **Hardcoded passwords** — Encrypt sensitive values (PINs, emergency codes) with AES-256, XOR, or Base64 before storing
- **Copy controls** — Allow or block clipboard access for extra security
- **Fully offline** — No network required after install

## Screenshots

### Unlock
![Unlock](docs/screenshots/login.png)

### Passwords
![Passwords](docs/screenshots/passwords.png)

### Recovery phrases
![Recovery phrases](docs/screenshots/recovery-phrases.png)

### Hardcoded password
![Hardcoded password](docs/screenshots/hardcoded.png)

## Tech stack

- React Native + Expo
- TypeScript
- Local storage + encryption utilities
- Biometrics support

## Getting started

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npx expo start
```

Then open it in Expo Go, an Android emulator, or an iOS simulator.

## Project structure (main parts)

```
app/                  # Expo Router entry points
screens/              # Login, Dashboard, Vault screens
screens/panels/       # Passwords, Recovery phrases, Hardcoded panels
components/           # UI components & logo
utils/                # Encryption, vault, biometrics, import/export
context/              # Theme & language
i18n/                 # Translations
```

## License

Private / All rights reserved (update as needed).
