export type EncryptionAlgorithm = 'aes256' | 'xor' | 'base64';

export const ENCRYPTION_OPTIONS: {
  value: EncryptionAlgorithm;
  label: string;
  description: string;
  needsKey: boolean;
}[] = [
  {
    value: 'aes256',
    label: 'AES-256',
    description: 'Strong symmetric encryption (key required)',
    needsKey: true,
  },
  {
    value: 'xor',
    label: 'XOR passphrase',
    description: 'Reversible XOR with your key (key required)',
    needsKey: true,
  },
  {
    value: 'base64',
    label: 'Base64',
    description: 'Encoding only — not real encryption',
    needsKey: false,
  },
];

export interface HardcodedPasswordEntry {
  id: string;
  name: string;
  /** Plaintext password (vault is already behind master lock) */
  password: string;
  /** Encrypted / encoded form for verification display */
  ciphertext: string;
  algorithm: EncryptionAlgorithm;
  /** Key used for AES / XOR (empty for base64) */
  encryptionKey: string;
  /** IV / salt payload when needed (hex) */
  iv?: string;
  /** If false, Copy actions are disabled for this entry */
  allowCopy: boolean;
  notes?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type HardcodedPasswordVault = HardcodedPasswordEntry[];
