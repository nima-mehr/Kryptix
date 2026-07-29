import * as SecureStore from 'expo-secure-store';
import type { RecoveryPhraseEntry, RecoveryPhraseVault } from '../types/recovery';

const RECOVERY_KEY = 'kryptix_recovery_phrases';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
};

export const countWords = (phrase: string): number => {
  return phrase
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
};

export const saveRecoveryVault = async (vault: RecoveryPhraseVault): Promise<void> => {
  try {
    await SecureStore.setItemAsync(RECOVERY_KEY, JSON.stringify(vault));
  } catch (error) {
    console.error('Failed to save recovery phrases:', error);
    throw error;
  }
};

export const loadRecoveryVault = async (): Promise<RecoveryPhraseVault> => {
  try {
    const json = await SecureStore.getItemAsync(RECOVERY_KEY);
    if (!json) return [];
    return JSON.parse(json) as RecoveryPhraseVault;
  } catch (error) {
    console.error('Failed to load recovery phrases:', error);
    return [];
  }
};

export const addRecoveryPhrase = async (
  entry: Omit<RecoveryPhraseEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  const vault = await loadRecoveryVault();
  const now = Date.now();
  vault.push({
    ...entry,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    favorite: entry.favorite ?? false,
  });
  await saveRecoveryVault(vault);
};

export const updateRecoveryPhrase = async (
  id: string,
  updates: Partial<Omit<RecoveryPhraseEntry, 'id' | 'createdAt'>>
): Promise<void> => {
  const vault = await loadRecoveryVault();
  const index = vault.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Entry not found');

  vault[index] = {
    ...vault[index],
    ...updates,
    updatedAt: Date.now(),
  };
  await saveRecoveryVault(vault);
};

export const deleteRecoveryPhrase = async (id: string): Promise<void> => {
  const vault = await loadRecoveryVault();
  await saveRecoveryVault(vault.filter((e) => e.id !== id));
};

export type { RecoveryPhraseEntry, RecoveryPhraseVault };
