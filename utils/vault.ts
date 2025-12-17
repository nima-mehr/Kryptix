import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import type { PasswordEntry, PasswordVault } from '../types/vault';

const VAULT_KEY = 'kryptix_vault';

/**
 * Save the entire vault securely
 */
export const saveVault = async (vault: PasswordVault): Promise<void> => {
  try {
    const json = JSON.stringify(vault);
    await SecureStore.setItemAsync(VAULT_KEY, json);
  } catch (error) {
    console.error('Failed to save vault:', error);
    throw error;
  }
};

/**
 * Load the entire vault
 */
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

/**
 * Add a new password entry
 */
export const addPassword = async (
  entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  const vault = await loadVault();
  const now = Date.now();

  const newEntry: PasswordEntry = {
    ...entry,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    favorite: entry.favorite ?? false,
  };

  vault.push(newEntry);
  await saveVault(vault);
};

/**
 * Update an existing password entry
 */
export const updatePassword = async (
  id: string,
  updates: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>
): Promise<void> => {
  const vault = await loadVault();
  const index = vault.findIndex((e) => e.id === id);

  if (index === -1) {
    throw new Error('Password entry not found');
  }

  vault[index] = {
    ...vault[index],
    ...updates,
    updatedAt: Date.now(),
  };

  await saveVault(vault);
};

/**
 * Delete a password entry
 */
export const deletePassword = async (id: string): Promise<void> => {
  const vault = await loadVault();
  const filteredVault = vault.filter((e) => e.id !== id);
  await saveVault(filteredVault);
};

// ← ADD THESE TWO LINES
export type { PasswordEntry, PasswordVault };