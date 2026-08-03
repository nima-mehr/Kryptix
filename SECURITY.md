# Security Policy

Kryptix is a local-first password and secrets vault. Security is a core design goal. We take reports of vulnerabilities seriously and appreciate responsible disclosure.

## Supported Versions

| Version / Branch | Supported |
|------------------|-----------|
| `master` (latest) | Yes |
| Older releases   | Best-effort |

Please test against the latest `master` branch when possible.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report them privately using one of these methods:

1. **GitHub Security Advisories** (preferred)  
   Go to the repository → Security → Advisories → New draft security advisory.

2. **Email**  
   Contact the maintainer at the email listed on the [GitHub profile](https://github.com/nima-mehr).

Please include:

- A clear description of the issue
- Steps to reproduce (or proof-of-concept if available)
- Affected platform(s) and version / commit if known
- Potential impact (e.g. plaintext exposure, key recovery, backup forgery, etc.)

We will acknowledge receipt as quickly as possible and aim to provide an initial assessment within a few days.

## Scope

In scope examples:

- Cryptographic weaknesses in encryption, key derivation, or the `.kryptix` backup format
- Improper handling of master password, biometrics, or SecureStore data
- Plaintext leakage of vault contents (passwords, recovery phrases, hardcoded secrets)
- Authentication / unlock bypasses
- Issues that allow an attacker with device access to extract secrets more easily than expected
- Supply-chain or dependency issues that meaningfully affect security

Out of scope (for now):

- Purely theoretical issues without a realistic attack path
- Social engineering or physical attacks against the user
- Issues in third-party dependencies that are already publicly known and tracked upstream (unless Kryptix uses them in an especially dangerous way)
- Feature requests or general hardening suggestions (these are welcome as normal issues)

## Security Model Summary

Kryptix is designed as a **local-first, offline vault**:

- No cloud backend stores user vault data.
- The master password is the root of trust.
- Biometric unlock is a convenience layer and is only available after the user has unlocked with the master password and explicitly enabled it.
- Recovery phrases and hardcoded secrets receive dedicated handling (decrypt-on-demand, show/hide controls, optional copy restrictions).
- Full-vault backups (`.kryptix`) use AES-256-CBC with a stretched key and a MAC for integrity.

The strongest long-term security property of Kryptix is that the source is public and can be independently reviewed.

## Disclosure Policy

- We prefer coordinated disclosure.
- Once a fix is available (or after a reasonable period), we will publish details so users can understand the issue and update.
- Credit will be given to reporters who wish to be acknowledged, unless they prefer to remain anonymous.

## Thank You

Responsible security research helps protect everyone who trusts a vault with their secrets. We appreciate your help in making Kryptix stronger.
