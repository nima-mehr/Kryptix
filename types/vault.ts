// types/vault.ts
export interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  category?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  favorite?: boolean;
}

export type PasswordVault = PasswordEntry[];