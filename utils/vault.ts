import EncryptedStorage from 'react-native-encrypted-storage';
import * as Crypto from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';

// Define the shape of a single password entry
export interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  category?: string;
  notes?: string;
}

// Derive a 32-byte key from master password + salt (for AES-256)
const deriveKey = async (password: string, salt: string): Promise<string> => {
  const keyMaterial = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + salt,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return keyMaterial.slice(0, 64); // 32 bytes = 64 hex chars
};

// Save encrypted vault
export const saveVault = async (vault: PasswordEntry[], masterPassword: string): Promise<void> => {
  try {
    const salt = Crypto.randomUUID();
    const data = JSON.stringify({ salt, vault });
    await EncryptedStorage.setItem('kryptix_vault', data);
  } catch (error) {
    console.error('Failed to save vault:', error);
    throw error;
  }
};

// Load and decrypt vault
export const loadVault = async (masterPassword: string): Promise<PasswordEntry[]> => {
  try {
    const data = await EncryptedStorage.getItem('kryptix_vault');
    if (!data) return [];

    const parsed = JSON.parse(data);
    const { vault } = parsed;
    return vault as PasswordEntry[];
  } catch (error) {
    console.error('Failed to load vault:', error);
    throw error;
  }
};

// Add a new password entry
export const addPassword = async (
  entry: Omit<PasswordEntry, 'id'>,
  masterPassword: string
): Promise<void> => {
  const vault = await loadVault(masterPassword);
  const newEntry: PasswordEntry = { ...entry, id: uuidv4() };
  vault.push(newEntry);
  await saveVault(vault, masterPassword);
};