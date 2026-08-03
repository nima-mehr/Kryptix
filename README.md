# Kryptix

**Privacy-first offline vault for passwords, recovery phrases, and sensitive secrets.**

Kryptix is a modern, fully offline password manager and secure vault built with React Native + Expo (mobile) and Tauri (desktop in progress).  
Your data never leaves your device unless **you** explicitly export an encrypted backup. No cloud accounts, no telemetry, no third-party servers.

> **Transparency first.**  
> Password vaults demand trust. The source is available so anyone can inspect the encryption, data handling, and architecture instead of relying on marketing claims.

---

## Why Kryptix?

Most password managers push you into the cloud. Kryptix takes the opposite approach:

- **True offline** — Works completely offline after install. Secrets stay on the device.
- **Purpose-built vaults** — Separate sections for everyday passwords, crypto recovery phrases, and high-sensitivity “hardcoded” values.
- **Strong encryption** — AES-256 with key stretching and integrity protection for full-vault backups (`.kryptix` format).
- **Biometric unlock** — Face ID / fingerprint after master-password authentication.
- **14 languages** — English, Persian, Russian, German, French, Chinese, Arabic, Turkish, Japanese, Spanish, Portuguese, Italian, Greek, Korean (LTR layout).
- **Intentional UX** — Distinctive intro animation, clean vault interface, and careful handling of sensitive data (show/hide, decrypt-on-demand, per-entry copy controls).

Kryptix is designed for people who want a serious, verifiable tool for their most important digital assets.

---

## Core Features

### Master Password + Biometrics
- Strong master password protection
- Optional biometric unlock (Face ID / fingerprint) via `expo-local-authentication`
- Biometrics only enabled after successful password unlock; preference stored securely

### Three Specialized Vaults

| Section              | Purpose                                      | Highlights |
|----------------------|----------------------------------------------|------------|
| **Passwords**        | Everyday logins                              | Categories, favorites, strong generator, JSON/CSV import & export |
| **Recovery Phrases** | Crypto / wallet seed phrases                 | Name, phrase, notes, favorites, word count, show/hide, copy, search |
| **Hardcoded**        | PINs, emergency codes, ultra-sensitive values | Decrypt-on-demand, per-entry `allowCopy`, multiple algorithms |

### Encrypted Full-Vault Backup (`.kryptix`)
- Export the entire vault (passwords + recovery phrases + hardcoded) into a single encrypted file
- AES-256-CBC + SHA-256 key stretching (KDF) + MAC for integrity
- Import with **merge** or **replace** options
- Protected by a separate export passphrase chosen by the user

### Internationalization
Full support for 14 languages with consistent LTR layout. Shell and settings are translated; panel strings continue to be wired to the translation system.

### Desktop (in progress)
A native desktop companion built with **Tauri 2 + React + TypeScript** is under active development (`desktop/` folder). Goal: shared encryption/types core and a consistent vault experience across mobile and desktop.

---

## Security Model (High Level)

Kryptix follows a local-first, user-controlled design:

- **No network dependency** after install — the app does not require internet to function.
- **Client-side encryption** — Sensitive data is protected on device. The application never sends vault contents to a server.
- **Master password** is the root of trust. Biometrics are a convenience layer only and are disabled until the user unlocks with the master password and opts in.
- **Recovery phrases** receive dedicated handling (show/hide, word count awareness, careful copy controls) rather than being treated as ordinary notes.
- **Hardcoded entries** are decrypted only when the user explicitly requests it. Per-entry copy permission is configurable.
- **Full-vault backups** use AES-256-CBC, a stretched key derived from a user-chosen passphrase, and a MAC so tampering can be detected.
- **Clipboard control** — Individual entries can restrict or allow copying.

We believe the strongest trust signal for a password vault is the ability for independent parties to review the code. That is why the repository is public.

For vulnerability reporting, supported versions, and disclosure policy, see **[SECURITY.md](SECURITY.md)**.

---

## Tech Stack

**Mobile**
- React Native + Expo (TypeScript)
- Expo Router
- SecureStore for sensitive preferences
- Custom encryption utilities
- `expo-local-authentication` for biometrics
- Multi-language i18n system

**Desktop (WIP)**
- Tauri 2 + React + TypeScript
- Shared core goals: encryption, types, vault logic

---

## Getting Started (Development)

```bash
# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

Then open the app in Expo Go, an iOS Simulator, or an Android Emulator.

### Project structure (key parts)

```
app/                  # Expo Router entry points
screens/              # Login, VaultHome, and related screens
components/           # UI components, tabs, backup modal, logo
utils/                # Encryption, biometrics, recovery, hardcoded, kryptix backup format, import/export
types/                # TypeScript definitions (passwords, recovery, hardcoded, vault format)
i18n/                 # Translation packs and registry
context/              # Theme & language context
desktop/              # Tauri 2 desktop app (in progress)
```

---

## Roadmap (high level)

- [x] Passwords vault with import/export
- [x] Recovery phrases CRUD + dedicated UX
- [x] Hardcoded passwords with decrypt-on-demand
- [x] Biometric unlock (post master-password)
- [x] Full-vault encrypted `.kryptix` backup / restore
- [x] Multi-language support (14 languages)
- [ ] Desktop app (Tauri) — core + vault UI
- [ ] Shared encryption / types package between mobile and desktop
- [ ] Additional hardening and documentation
- [ ] Independent security review (planned)

---

## Contributing

Contributions, security feedback, and thoughtful issue reports are welcome.  
Please open an issue or pull request. For security-sensitive reports, see [SECURITY.md](SECURITY.md).

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Kryptix** — Your secrets, under your control.
