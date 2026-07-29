export interface RecoveryPhraseEntry {
  id: string;
  /** Label, e.g. "MetaMask", "Ledger BTC" */
  name: string;
  /** Seed / recovery phrase words */
  phrase: string;
  notes?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type RecoveryPhraseVault = RecoveryPhraseEntry[];
