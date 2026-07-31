import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type {
  KryptixImportMode,
  KryptixImportResult,
  KryptixSectionFlags,
  KryptixVaultFile,
  KryptixVaultPayload,
} from '../types/kryptixVault';
import { KRYPTIX_FILE_EXTENSION } from '../types/kryptixVault';
import type { PasswordEntry } from '../types/vault';
import type { RecoveryPhraseEntry } from '../types/recovery';
import type { HardcodedPasswordEntry } from '../types/hardcoded';
import { loadVault, saveVault } from './vault';
import { loadRecoveryVault, saveRecoveryVault } from './recovery';
import { loadHardcodedVault, saveHardcodedVault } from './hardcoded';
import {
  buildPayload,
  decryptVaultFile,
  encryptVaultFile,
  isKryptixFileName,
  parseVaultFileJson,
} from './kryptixFormat';

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 11);

export async function getSectionCounts(): Promise<{
  passwords: number;
  recovery: number;
  hardcoded: number;
}> {
  const [p, r, h] = await Promise.all([
    loadVault(),
    loadRecoveryVault(),
    loadHardcodedVault(),
  ]);
  return { passwords: p.length, recovery: r.length, hardcoded: h.length };
}

export async function exportKryptixVault(
  sections: KryptixSectionFlags,
  passphrase: string
): Promise<void> {
  if (!sections.passwords && !sections.recovery && !sections.hardcoded) {
    throw new Error('Select at least one section to export');
  }

  const [passwords, recovery, hardcoded] = await Promise.all([
    sections.passwords ? loadVault() : Promise.resolve([]),
    sections.recovery ? loadRecoveryVault() : Promise.resolve([]),
    sections.hardcoded ? loadHardcodedVault() : Promise.resolve([]),
  ]);

  if (
    (sections.passwords && passwords.length === 0) &&
    (sections.recovery && recovery.length === 0) &&
    (sections.hardcoded && hardcoded.length === 0)
  ) {
    // still allow empty sections if user selected them but vault empty overall
  }

  const total =
    (sections.passwords ? passwords.length : 0) +
    (sections.recovery ? recovery.length : 0) +
    (sections.hardcoded ? hardcoded.length : 0);
  if (total === 0) {
    throw new Error('Nothing to export in the selected sections');
  }

  const payload = buildPayload(sections, passwords, recovery, hardcoded);
  const file = await encryptVaultFile(payload, passphrase, sections);
  const json = JSON.stringify(file, null, 2);

  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!base) throw new Error('No writable directory available');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const fileUri = `${base}kryptix-backup-${stamp}.${KRYPTIX_FILE_EXTENSION}`;
  await FileSystem.writeAsStringAsync(fileUri, json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Kryptix vault',
      UTI: 'public.json',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

export async function pickKryptixFile(): Promise<{
  file: KryptixVaultFile;
  name: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri);
  const file = parseVaultFileJson(content);
  return { file, name: asset.name || `backup.${KRYPTIX_FILE_EXTENSION}` };
}

export async function decryptPickedKryptix(
  file: KryptixVaultFile,
  passphrase: string
): Promise<KryptixVaultPayload> {
  return decryptVaultFile(file, passphrase);
}

function passwordKey(e: PasswordEntry): string {
  return `${(e.site || '').toLowerCase()}|${(e.username || '').toLowerCase()}`;
}

function recoveryKey(e: RecoveryPhraseEntry): string {
  return (e.name || '').toLowerCase().trim();
}

function hardcodedKey(e: HardcodedPasswordEntry): string {
  return (e.name || '').toLowerCase().trim();
}

function normalizePassword(e: PasswordEntry): PasswordEntry {
  const now = Date.now();
  return {
    id: e.id || generateId(),
    site: e.site || 'Imported',
    url: e.url,
    username: e.username || '',
    password: e.password || '',
    category: e.category,
    notes: e.notes,
    createdAt: e.createdAt || now,
    updatedAt: e.updatedAt || now,
    favorite: e.favorite ?? false,
  };
}

function normalizeRecovery(e: RecoveryPhraseEntry): RecoveryPhraseEntry {
  const now = Date.now();
  return {
    id: e.id || generateId(),
    name: e.name || 'Imported',
    phrase: e.phrase || '',
    notes: e.notes,
    favorite: e.favorite ?? false,
    createdAt: e.createdAt || now,
    updatedAt: e.updatedAt || now,
  };
}

function normalizeHardcoded(e: HardcodedPasswordEntry): HardcodedPasswordEntry {
  const now = Date.now();
  return {
    id: e.id || generateId(),
    name: e.name || 'Imported',
    password: e.password || '',
    ciphertext: e.ciphertext || '',
    algorithm: e.algorithm || 'base64',
    encryptionKey: e.encryptionKey || '',
    iv: e.iv,
    allowCopy: e.allowCopy ?? true,
    notes: e.notes,
    favorite: e.favorite ?? false,
    createdAt: e.createdAt || now,
    updatedAt: e.updatedAt || now,
  };
}

export async function commitKryptixImport(
  payload: KryptixVaultPayload,
  sections: KryptixSectionFlags,
  mode: KryptixImportMode
): Promise<KryptixImportResult> {
  const result: KryptixImportResult = {
    passwords: { imported: 0, skipped: 0 },
    recovery: { imported: 0, skipped: 0 },
    hardcoded: { imported: 0, skipped: 0 },
  };

  if (sections.passwords) {
    const incoming = (payload.passwords || []).map(normalizePassword).filter((e) => e.password);
    if (mode === 'replaceSections') {
      await saveVault(incoming);
      result.passwords.imported = incoming.length;
    } else {
      const existing = await loadVault();
      const keys = new Set(existing.map(passwordKey));
      for (const e of incoming) {
        const k = passwordKey(e);
        if (keys.has(k)) {
          result.passwords.skipped++;
          continue;
        }
        existing.push({ ...e, id: generateId() });
        keys.add(k);
        result.passwords.imported++;
      }
      await saveVault(existing);
    }
  }

  if (sections.recovery) {
    const incoming = (payload.recoveryPhrases || [])
      .map(normalizeRecovery)
      .filter((e) => e.phrase.trim());
    if (mode === 'replaceSections') {
      await saveRecoveryVault(incoming);
      result.recovery.imported = incoming.length;
    } else {
      const existing = await loadRecoveryVault();
      const keys = new Set(existing.map(recoveryKey));
      for (const e of incoming) {
        const k = recoveryKey(e);
        if (keys.has(k)) {
          result.recovery.skipped++;
          continue;
        }
        existing.push({ ...e, id: generateId() });
        keys.add(k);
        result.recovery.imported++;
      }
      await saveRecoveryVault(existing);
    }
  }

  if (sections.hardcoded) {
    const incoming = (payload.hardcoded || [])
      .map(normalizeHardcoded)
      .filter((e) => e.password || e.ciphertext);
    if (mode === 'replaceSections') {
      await saveHardcodedVault(incoming);
      result.hardcoded.imported = incoming.length;
    } else {
      const existing = await loadHardcodedVault();
      const keys = new Set(existing.map(hardcodedKey));
      for (const e of incoming) {
        const k = hardcodedKey(e);
        if (keys.has(k)) {
          result.hardcoded.skipped++;
          continue;
        }
        existing.push({ ...e, id: generateId() });
        keys.add(k);
        result.hardcoded.imported++;
      }
      await saveHardcodedVault(existing);
    }
  }

  return result;
}

export { isKryptixFileName };
