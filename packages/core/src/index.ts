// Types
export type { PasswordEntry, PasswordVault } from './types/vault';
export type { RecoveryPhraseEntry, RecoveryPhraseVault } from './types/recovery';
export type {
  EncryptionAlgorithm,
  HardcodedPasswordEntry,
  HardcodedPasswordVault,
} from './types/hardcoded';
export { ENCRYPTION_OPTIONS } from './types/hardcoded';
export type {
  KryptixSectionFlags,
  KryptixVaultPayload,
  KryptixVaultFile,
  KryptixImportMode,
  KryptixImportResult,
} from './types/kryptixVault';
export {
  KRYPTIX_FORMAT_ID,
  KRYPTIX_FORMAT_VERSION,
  KRYPTIX_FILE_EXTENSION,
} from './types/kryptixVault';

// Crypto
export {
  encryptPassword,
  decryptPassword,
  algorithmLabel,
} from './crypto/encryption';
export type { EncryptResult } from './crypto/encryption';

// .kryptix format (encryptVaultFile / decryptVaultFile) — enable when kryptixFormat.ts is present
// export {
//   buildPayload,
//   encryptVaultFile,
//   decryptVaultFile,
//   parseVaultFileJson,
//   isKryptixFileName,
// } from './crypto/kryptixFormat';

// Utils
export { generateId } from './utils/id';
export { countWords } from './utils/words';
