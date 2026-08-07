import type { PasswordEntry } from './vault';
import type { RecoveryPhraseEntry } from './recovery';
import type { HardcodedPasswordEntry } from './hardcoded';

/** Outer file marker — keep stable for desktop / extension */
export const KRYPTIX_FORMAT_ID = 'KRYPTIX-VAULT' as const;
export const KRYPTIX_FORMAT_VERSION = 1 as const;
export const KRYPTIX_FILE_EXTENSION = 'kryptix';

export type KryptixSectionFlags = {
  passwords: boolean;
  recovery: boolean;
  hardcoded: boolean;
};

export type KryptixVaultPayload = {
  format: 'KRYPTIX-VAULT-PAYLOAD';
  version: typeof KRYPTIX_FORMAT_VERSION;
  exportedAt: number;
  appVersion?: string;
  passwords: PasswordEntry[];
  recoveryPhrases: RecoveryPhraseEntry[];
  hardcoded: HardcodedPasswordEntry[];
};

/**
 * On-disk .kryptix file (JSON text).
 * Ciphertext is AES-256-CBC (hex) with random IV; key from stretched SHA-256 of passphrase+salt.
 * mac = SHA-256(passphrase|salt|iv|ciphertext) for integrity.
 */
export type KryptixVaultFile = {
  format: typeof KRYPTIX_FORMAT_ID;
  version: typeof KRYPTIX_FORMAT_VERSION;
  createdAt: number;
  kdf: 'sha256-stretch';
  kdfIterations: number;
  cipher: 'aes-256-cbc';
  salt: string;
  iv: string;
  ciphertext: string;
  mac: string;
  meta: {
    includePasswords: boolean;
    includeRecovery: boolean;
    includeHardcoded: boolean;
    counts: {
      passwords: number;
      recovery: number;
      hardcoded: number;
    };
  };
};

export type KryptixImportMode = 'merge' | 'replaceSections';

export type KryptixImportResult = {
  passwords: { imported: number; skipped: number };
  recovery: { imported: number; skipped: number };
  hardcoded: { imported: number; skipped: number };
};
