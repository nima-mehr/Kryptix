import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { loadVault, saveVault, PasswordEntry, PasswordVault } from './vault';

// ====================== EXPORT ======================

export const exportAsJSON = async (): Promise<void> => {
  const vault = await loadVault();
  const json = JSON.stringify(vault, null, 2);
  const fileUri = FileSystem.cacheDirectory + 'kryptix-export.json';

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Kryptix Vault',
      UTI: 'public.json',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
};

export const exportAsCSV = async (): Promise<void> => {
  const vault = await loadVault();

  // Chrome/Firefox compatible format
  const header = 'name,url,username,password';
  const rows = vault.map((entry) => {
    const name = escapeCSV(entry.site);
    const url = escapeCSV(entry.site.startsWith('http') ? entry.site : '');
    const username = escapeCSV(entry.username);
    const password = escapeCSV(entry.password);
    return `${name},${url},${username},${password}`;
  });

  const csv = [header, ...rows].join('\n');
  const fileUri = FileSystem.cacheDirectory + 'kryptix-export.csv';

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Kryptix Vault (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
};

const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// ====================== IMPORT ======================

export type ImportResult = {
  imported: number;
  skipped: number;
  total: number;
};

export const importFromFile = async (): Promise<ImportResult> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { imported: 0, skipped: 0, total: 0 };
  }

  const file = result.assets[0];
  const content = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const name = (file.name || '').toLowerCase();

  let entries: PasswordEntry[] = [];

  if (name.endsWith('.json') || content.trim().startsWith('[')) {
    entries = parseJSON(content);
  } else {
    entries = parseCSV(content);
  }

  if (entries.length === 0) {
    throw new Error('No valid passwords found in the file');
  }

  const existingVault = await loadVault();
  const existingKeys = new Set(
    existingVault.map((e) => `${e.site.toLowerCase()}|${e.username.toLowerCase()}`)
  );

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const key = `${entry.site.toLowerCase()}|${entry.username.toLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingVault.push(entry);
    existingKeys.add(key);
    imported++;
  }

  await saveVault(existingVault);

  return {
    imported,
    skipped,
    total: entries.length,
  };
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
};

const parseJSON = (content: string): PasswordEntry[] => {
  const data = JSON.parse(content);
  if (!Array.isArray(data)) throw new Error('Invalid JSON format');

  const now = Date.now();
  return data
    .filter((item) => item && (item.site || item.name) && item.password)
    .map((item) => ({
      id: item.id || generateId(),
      site: item.site || item.name || item.title || 'Unknown',
      username: item.username || item.user || item.email || '',
      password: item.password,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
      favorite: item.favorite ?? false,
      notes: item.notes,
      category: item.category,
    }));
};

const parseCSV = (content: string): PasswordEntry[] => {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) throw new Error('CSV file is empty or invalid');

  const headerLine = lines[0].toLowerCase();
  const headers = parseCSVLine(headerLine);

  // Detect column indexes (Chrome, Firefox, Edge, Safari variations)
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findCol('name', 'title', 'site');
  const urlIdx = findCol('url', 'website', 'origin');
  const userIdx = findCol('username', 'user', 'login', 'email');
  const passIdx = findCol('password', 'pass');

  if (passIdx === -1) {
    throw new Error('Could not find password column in CSV');
  }

  const now = Date.now();
  const entries: PasswordEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0) continue;

    const password = cols[passIdx]?.trim();
    if (!password) continue;

    const site =
      (nameIdx !== -1 ? cols[nameIdx] : '') ||
      (urlIdx !== -1 ? cols[urlIdx] : '') ||
      'Imported';

    const username = userIdx !== -1 ? cols[userIdx] || '' : '';

    entries.push({
      id: generateId(),
      site: site.trim(),
      username: username.trim(),
      password,
      createdAt: now,
      updatedAt: now,
      favorite: false,
    });
  }

  return entries;
};

/** Simple CSV line parser that handles quoted fields */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
};
