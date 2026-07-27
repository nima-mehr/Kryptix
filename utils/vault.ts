import * as SecureStore from 'expo-secure-store';
import type { PasswordEntry, PasswordVault } from '../types/vault';

const VAULT_KEY = 'kryptix_vault';

// Reliable ID generator that works everywhere (no crypto.getRandomValues needed)
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
};

export const saveVault = async (vault: PasswordVault): Promise<void> => {
  try {
    const json = JSON.stringify(vault);
    await SecureStore.setItemAsync(VAULT_KEY, json);
  } catch (error) {
    console.error('Failed to save vault:', error);
    throw error;
  }
};

export const loadVault = async (): Promise<PasswordVault> => {
  try {
    const json = await SecureStore.getItemAsync(VAULT_KEY);
    if (!json) return [];
    return JSON.parse(json) as PasswordVault;
  } catch (error) {
    console.error('Failed to load vault:', error);
    return [];
  }
};

export const addPassword = async (
  entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  const vault = await loadVault();
  const now = Date.now();
  const newEntry: PasswordEntry = {
    ...entry,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    favorite: entry.favorite ?? false,
  };
  vault.push(newEntry);
  await saveVault(vault);
};

export const updatePassword = async (
  id: string,
  updates: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>
): Promise<void> => {
  const vault = await loadVault();
  const index = vault.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Entry not found');

  vault[index] = {
    ...vault[index],
    ...updates,
    updatedAt: Date.now(),
  };
  await saveVault(vault);
};

export const deletePassword = async (id: string): Promise<void> => {
  const vault = await loadVault();
  const filtered = vault.filter((e) => e.id !== id);
  await saveVault(filtered);
};

// Re-export types for easy importing
export type { PasswordEntry, PasswordVault };
