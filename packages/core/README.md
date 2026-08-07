# @kryptix/core

Shared pure TypeScript logic for **Kryptix** (mobile + desktop).

## What lives here

- **Types** — passwords, recovery phrases, hardcoded entries, `.kryptix` format
- **Crypto** — AES-256 / XOR / Base64 helpers + full `.kryptix` encrypt/decrypt
- **Utils** — `generateId`, `countWords`

No React Native, no Expo, no Tauri, no UI.

## Usage

```ts
import {
  encryptPassword,
  decryptPassword,
  encryptVaultFile,
  decryptVaultFile,
  generateId,
  type PasswordEntry,
} from '@kryptix/core';
```

## Platform notes

- Uses **Web Crypto API** for SHA-256 and random bytes.
- Works in modern browsers, Tauri webviews, and Node 18+.
- Mobile (Expo) currently still has its own copies that use `expo-crypto`. We can migrate later.
