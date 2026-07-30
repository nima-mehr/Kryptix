import * as SecureStore from 'expo-secure-store';
import type { HardcodedPasswordEntry, HardcodedPasswordVault } from '../types/hardcoded';

const HARDCODED_KEY = 'kryptix_hardcoded_passwords';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
};

export const saveHardcodedVault = async (vault: HardcodedPasswordVault): Promise<void> => {
  try {
    await SecureStore.setItemAsync(HARDCODED_KEY, JSON.stringify(vault));
  } catch (error) {
    console.error('Failed to save hardcoded passwords:', error);
    throw error;
  }
};

export const loadHardcodedVault = async (): Promise<HardcodedPasswordVault> => {
  try {
    const json = await SecureStore.getItemAsync(HARDCODED_KEY);
    if (!json) return [];
    return JSON.parse(json) as HardcodedPasswordVault;
  } catch (error) {
    console.error('Failed to load hardcoded passwords:', error);
    return [];
  }
};

export const addHardcodedPassword = async (
  entry: Omit<HardcodedPasswordEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  const vault = await loadHardcodedVault();
  const now = Date.now();
  vault.push({
    ...entry,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    favorite: entry.favorite ?? false,
  });
  await saveHardcodedVault(vault);
};

export const updateHardcodedPassword = async (
  id: string,
  updates: Partial<Omit<HardcodedPasswordEntry, 'id' | 'createdAt'>>
): Promise<void> => {
  const vault = await loadHardcodedVault();
  const index = vault.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Entry not found');

  vault[index] = {
    ...vault[index],
    ...updates,
    updatedAt: Date.now(),
  };
  await saveHardcodedVault(vault);
};

export const deleteHardcodedPassword = async (id: string): Promise<void> => {
  const vault = await loadHardcodedVault();
  await saveHardcodedVault(vault.filter((e) => e.id !== id));
};

export const deleteHardcodedPasswords = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const vault = await loadHardcodedVault();
  await saveHardcodedVault(vault.filter((e) => !idSet.has(e.id)));
};

export type { HardcodedPasswordEntry, HardcodedPasswordVault };
