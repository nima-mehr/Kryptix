// types/vault.ts
export interface PasswordEntry {
  id: string;
  /** Display name (maps to browser "name" column) */
  site: string;
  /** Website URL (maps to browser "url" column) */
  url?: string;
  username: string;
  password: string;
  category?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  favorite?: boolean;
}

export type PasswordVault = PasswordEntry[];
