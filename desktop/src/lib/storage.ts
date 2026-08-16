/**
 * Desktop vault storage.
 *
 * Persists encrypted JSON via tauri-plugin-store.
 * Encryption uses the shared @kryptix/core AES-256 helpers and the
 * user's master password (never stored on disk).
 */
import { load, type Store } from '@tauri-apps/plugin-store';
import {
  encryptPassword,
  decryptPassword,
  type PasswordVault,
  type RecoveryPhraseVault,
  type HardcodedPasswordVault,
} from '@kryptix/core';

const STORE_FILE = 'kryptix-vault.json';

const KEYS = {
  passwords: 'kryptix_vault',
  recovery: 'kryptix_recovery_phrases',
  hardcoded: 'kryptix_hardcoded_passwords',
  /** Marker that a vault has been created (does not store the password) */
  vaultExists: 'kryptix_vault_exists',
} as const;

type EncryptedBlob = {
  ciphertext: string;
  iv: string;
};

let storePromise: Promise<Store> | null = null;
let sessionMaster: string | null = null;

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { autoSave: true });
  }
  return storePromise;
}

async function encryptJson(data: unknown, master: string): Promise<EncryptedBlob> {
  const plaintext = JSON.stringify(data);
  const result = await encryptPassword(plaintext, 'aes256', master);
  if (!result.iv) throw new Error('AES encrypt did not return IV');
  return { ciphertext: result.ciphertext, iv: result.iv };
}

async function decryptJson<T>(blob: EncryptedBlob, master: string): Promise<T> {
  const plaintext = await decryptPassword(blob.ciphertext, 'aes256', master, blob.iv);
  return JSON.parse(plaintext) as T;
}

/** True if a vault has been set up on this machine */
export async function vaultExists(): Promise<boolean> {
  const store = await getStore();
  const flag = await store.get<boolean>(KEYS.vaultExists);
  return flag === true;
}

/**
 * Create a new empty vault protected by the master password.
 * Fails if a vault already exists.
 */
export async function createVault(masterPassword: string): Promise<void> {
  if (!masterPassword || masterPassword.length < 4) {
    throw new Error('Master password must be at least 4 characters');
  }
  if (await vaultExists()) {
    throw new Error('Vault already exists — unlock instead');
  }

  const store = await getStore();
  const emptyPasswords = await encryptJson([] as PasswordVault, masterPassword);
  const emptyRecovery = await encryptJson([] as RecoveryPhraseVault, masterPassword);
  const emptyHardcoded = await encryptJson([] as HardcodedPasswordVault, masterPassword);

  await store.set(KEYS.passwords, emptyPasswords);
  await store.set(KEYS.recovery, emptyRecovery);
  await store.set(KEYS.hardcoded, emptyHardcoded);
  await store.set(KEYS.vaultExists, true);
  await store.save();

  sessionMaster = masterPassword;
}

/**
 * Unlock the vault for this session. Validates the password by trying to decrypt.
 */
export async function unlockVault(masterPassword: string): Promise<void> {
  if (!masterPassword) throw new Error('Password required');
  if (!(await vaultExists())) {
    throw new Error('No vault found — create one first');
  }

  const store = await getStore();
  const blob = await store.get<EncryptedBlob>(KEYS.passwords);
  if (!blob?.ciphertext || !blob?.iv) {
    throw new Error('Vault data is missing or corrupt');
  }

  try {
    await decryptJson<PasswordVault>(blob, masterPassword);
  } catch {
    throw new Error('Wrong master password');
  }

  sessionMaster = masterPassword;
}

/** Clear the in-memory master password (lock the vault). */
export function lockVault(): void {
  sessionMaster = null;
}

export function isUnlocked(): boolean {
  return sessionMaster !== null;
}

/** Session master password while unlocked (for enabling biometrics). */
export function getSessionMaster(): string | null {
  return sessionMaster;
}

function requireMaster(): string {
  if (!sessionMaster) throw new Error('Vault is locked');
  return sessionMaster;
}

// ---- Passwords ----

export async function loadPasswords(): Promise<PasswordVault> {
  const master = requireMaster();
  const store = await getStore();
  const blob = await store.get<EncryptedBlob>(KEYS.passwords);
  if (!blob) return [];
  return decryptJson<PasswordVault>(blob, master);
}

export async function savePasswords(vault: PasswordVault): Promise<void> {
  const master = requireMaster();
  const store = await getStore();
  const blob = await encryptJson(vault, master);
  await store.set(KEYS.passwords, blob);
  await store.save();
}

// ---- Recovery phrases ----

export async function loadRecovery(): Promise<RecoveryPhraseVault> {
  const master = requireMaster();
  const store = await getStore();
  const blob = await store.get<EncryptedBlob>(KEYS.recovery);
  if (!blob) return [];
  return decryptJson<RecoveryPhraseVault>(blob, master);
}

export async function saveRecovery(vault: RecoveryPhraseVault): Promise<void> {
  const master = requireMaster();
  const store = await getStore();
  const blob = await encryptJson(vault, master);
  await store.set(KEYS.recovery, blob);
  await store.save();
}

// ---- Hardcoded passwords ----

export async function loadHardcoded(): Promise<HardcodedPasswordVault> {
  const master = requireMaster();
  const store = await getStore();
  const blob = await store.get<EncryptedBlob>(KEYS.hardcoded);
  if (!blob) return [];
  return decryptJson<HardcodedPasswordVault>(blob, master);
}

export async function saveHardcoded(vault: HardcodedPasswordVault): Promise<void> {
  const master = requireMaster();
  const store = await getStore();
  const blob = await encryptJson(vault, master);
  await store.set(KEYS.hardcoded, blob);
  await store.save();
}
