# Privacy Policy for Kryptix

**Last updated:** 19 August 2026  
**Effective date:** 15 August 2026

Kryptix (“the App”, “we”, “us”) is a privacy-first, offline password and secrets vault for mobile and desktop.  
This Privacy Policy explains what information is — and is not — collected when you use the App.

**The short version:**  
We collect nothing. Your vault data never leaves your device unless you explicitly export an encrypted backup. We have no servers that receive your secrets, no analytics, and no accounts.

---

## 1. Who we are

Kryptix is a source-available application (not open source).  
Source code: [https://github.com/nima-mehr/Kryptix](https://github.com/nima-mehr/Kryptix)  
License: PolyForm Noncommercial 1.0.0 — see the LICENSE file in the repository.

Contact for privacy questions: open an issue on the GitHub repository, or use the contact method listed in the App Store / Google Play listing or the project README.

---

## 2. Information we do **not** collect

Kryptix is designed so that the following are never collected, transmitted, or accessible to the developer:

- Passwords, usernames, recovery phrases, notes, or any vault contents  
- Master password or derived encryption keys  
- Biometric data (Face ID, fingerprint, Windows Hello, etc.)  
- Personal identifiers (name, email, phone number, address)  
- Device identifiers, advertising IDs, or IP addresses  
- Usage analytics, feature usage, session data, or behavioural tracking  
- Crash reports or diagnostic data sent to us  
- Location data  
- Clipboard contents (except temporary local use when you choose to copy)  
- Any data from third-party analytics, advertising, or crash-reporting SDKs (we do not include them)

We operate **no backend servers** for the App. There is no account system and no cloud sync operated by us.

---

## 3. Data stored on your device

All data you enter is stored **locally** on your device:

- **Mobile:** encrypted using platform secure storage and the App’s encryption utilities (AES-256 family).  
- **Desktop:** encrypted at rest via the master password and stored with the local app store (tauri-plugin-store).

Biometric unlock (when enabled) is handled entirely by the operating system’s secure enclave / biometric framework. The App never receives or stores your biometric templates.

You can delete all App data at any time by:

- Uninstalling the App, or  
- Using in-app clear / reset options (where available), or  
- Deleting the local vault files on desktop.

---

## 4. Optional encrypted backups (`.kryptix` files)

You may choose to export a full-vault encrypted backup (`.kryptix` format).

- Encryption and decryption happen entirely on your device.  
- The backup is protected by a passphrase **you** choose.  
- We never receive the backup file or the passphrase.  
- You are solely responsible for where you store the exported file (local disk, your own cloud storage, USB, etc.).

Importing a backup is also performed entirely on-device.

---

## 5. Permissions the App may request

The App may request the following system permissions solely to provide on-device functionality:

- **Biometric authentication** (Face ID, fingerprint, etc.) — optional convenience unlock after master-password setup  
- **Secure storage / keychain access** — to protect vault data and preferences  
- **Clipboard access** — only when you explicitly copy an entry  
- **File system / document picker** — only when you choose to import or export a backup

Granting these permissions does **not** cause any data to be sent to us.

---

## 6. Third-party services

Kryptix does not integrate third-party analytics, advertising, crash reporting, or tracking SDKs.

Platform providers (Apple, Google, Microsoft, and others) and your device’s operating system may process limited data independently according to their own privacy policies — for example App Store / Play Store transactions, optional OS-level crash reports you choose to send, or device cloud backups if you enable them at the OS level.

If you use optional import/export with your own cloud storage, that storage provider’s terms and privacy policy apply to the encrypted file you place there.

---

## 7. Children’s privacy

The App does not knowingly collect personal information from anyone, including children. Because no data is transmitted to us, the App does not create the typical data-collection risks associated with children’s privacy laws.

---

## 8. International users

Because we do not collect or process personal data about you through normal use of the App, most data-protection obligations that apply to data controllers do not arise.

If you contact us (for example via GitHub) and voluntarily provide personal information such as an email address, we will use it only to respond to your inquiry and will delete it on request.

---

## 9. Changes to this Privacy Policy

We may update this Privacy Policy from time to time. The “Last updated” date at the top will be revised. Continued use of the App after changes constitutes acceptance of the updated policy. Material changes will be noted in the GitHub repository or App release notes when practical.

---

## 10. Contact

For questions about this Privacy Policy:

- Open an issue at [https://github.com/nima-mehr/Kryptix](https://github.com/nima-mehr/Kryptix)  
- Or use the support / contact channel listed in the official App Store or Google Play listing

---

**Your secrets stay on your device. That is the entire point of Kryptix.**
