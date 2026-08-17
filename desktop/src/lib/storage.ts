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
  categories: 'kryptix_categories',
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

export function lockVault(): void {
  sessionMaster = null;
}

export function isUnlocked(): boolean {
  return sessionMaster !== null;
}

export function getSessionMaster(): string | null {
  return sessionMaster;
}

function requireMaster(): string {
  if (!sessionMaster) throw new Error('Vault is locked');
  return sessionMaster;
}

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

export async function loadCategories(): Promise<string[]> {
  const store = await getStore();
  const list = await store.get<string[]>(KEYS.categories);
  return Array.isArray(list) ? list : [];
}

export async function saveCategories(categories: string[]): Promise<void> {
  const store = await getStore();
  await store.set(KEYS.categories, categories);
  await store.save();
}

export async function addCategory(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');
  const categories = await loadCategories();
  if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Category already exists');
  }
  const updated = [...categories, trimmed];
  await saveCategories(updated);
  return updated;
}

export async function deleteCategory(name: string): Promise<string[]> {
  const categories = await loadCategories();
  const updated = categories.filter((c) => c !== name);
  await saveCategories(updated);
  return updated;
}
