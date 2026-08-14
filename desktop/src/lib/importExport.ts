/**
 * Plain JSON / CSV helpers for desktop import & export.
 * (Encrypted .kryptix lives in @kryptix/core)
 */
import { generateId, type PasswordEntry, type RecoveryPhraseEntry, type HardcodedPasswordEntry } from "@kryptix/core";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function splitCsvRows(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function passwordsToJson(entries: PasswordEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function passwordsFromJson(text: string): PasswordEntry[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of password entries");
  const now = Date.now();
  return data.map((raw: Record<string, unknown>, i: number) => {
    const site = String(raw.site ?? raw.title ?? raw.name ?? "").trim();
    const username = String(raw.username ?? raw.user ?? raw.login ?? "").trim();
    const password = String(raw.password ?? raw.pass ?? "").trim();
    if (!site && !username && !password) {
      throw new Error(`Entry ${i + 1} is empty`);
    }
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : generateId(),
      site: site || "Imported",
      url: raw.url ? String(raw.url) : undefined,
      username: username || "",
      password: password || "",
      notes: raw.notes ? String(raw.notes) : undefined,
      favorite: Boolean(raw.favorite),
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    } satisfies PasswordEntry;
  });
}

export function passwordsToCsv(entries: PasswordEntry[]): string {
  const header = "site,url,username,password,notes,favorite";
  const rows = entries.map((e) =>
    [
      escapeCsv(e.site),
      escapeCsv(e.url ?? ""),
      escapeCsv(e.username),
      escapeCsv(e.password),
      escapeCsv(e.notes ?? ""),
      e.favorite ? "1" : "0",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function passwordsFromCsv(text: string): PasswordEntry[] {
  const lines = splitCsvRows(text);
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string, ...alts: string[]) => {
    for (const n of [name, ...alts]) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iSite = idx("site", "title", "name", "service");
  const iUrl = idx("url", "website", "link");
  const iUser = idx("username", "user", "login", "email");
  const iPass = idx("password", "pass", "pwd");
  const iNotes = idx("notes", "note", "comment");
  const iFav = idx("favorite", "favourite", "star");

  if (iSite < 0 && iUser < 0 && iPass < 0) {
    throw new Error("CSV missing required columns (site / username / password)");
  }

  const now = Date.now();
  const out: PasswordEntry[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = parseCsvLine(lines[r]);
    const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
    const site = get(iSite) || "Imported";
    const username = get(iUser);
    const password = get(iPass);
    if (!site && !username && !password) continue;
    out.push({
      id: generateId(),
      site,
      url: get(iUrl) || undefined,
      username,
      password,
      notes: get(iNotes) || undefined,
      favorite: ["1", "true", "yes"].includes(get(iFav).toLowerCase()),
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

export function recoveryToJson(entries: RecoveryPhraseEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function recoveryFromJson(text: string): RecoveryPhraseEntry[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of recovery entries");
  const now = Date.now();
  return data.map((raw: Record<string, unknown>, i: number) => {
    const name = String(raw.name ?? raw.title ?? "").trim();
    const phrase = String(raw.phrase ?? raw.seed ?? raw.mnemonic ?? "").trim();
    if (!name && !phrase) throw new Error(`Entry ${i + 1} is empty`);
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : generateId(),
      name: name || "Imported",
      phrase: phrase || "",
      notes: raw.notes ? String(raw.notes) : undefined,
      favorite: Boolean(raw.favorite),
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    } satisfies RecoveryPhraseEntry;
  });
}

export function recoveryToCsv(entries: RecoveryPhraseEntry[]): string {
  const header = "name,phrase,notes,favorite";
  const rows = entries.map((e) =>
    [
      escapeCsv(e.name),
      escapeCsv(e.phrase),
      escapeCsv(e.notes ?? ""),
      e.favorite ? "1" : "0",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function recoveryFromCsv(text: string): RecoveryPhraseEntry[] {
  const lines = splitCsvRows(text);
  if (lines.length < 2) throw new Error("CSV has no data rows");
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string, ...alts: string[]) => {
    for (const n of [name, ...alts]) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iName = idx("name", "title");
  const iPhrase = idx("phrase", "seed", "mnemonic", "recovery");
  const iNotes = idx("notes", "note");
  const iFav = idx("favorite", "favourite");
  if (iPhrase < 0) throw new Error("CSV missing phrase/seed column");

  const now = Date.now();
  const out: RecoveryPhraseEntry[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = parseCsvLine(lines[r]);
    const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
    const phrase = get(iPhrase);
    if (!phrase) continue;
    out.push({
      id: generateId(),
      name: get(iName) || "Imported",
      phrase,
      notes: get(iNotes) || undefined,
      favorite: ["1", "true", "yes"].includes(get(iFav).toLowerCase()),
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

export function hardcodedToJson(entries: HardcodedPasswordEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function hardcodedFromJson(text: string): HardcodedPasswordEntry[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of hardcoded entries");
  const now = Date.now();
  return data.map((raw: Record<string, unknown>, i: number) => {
    const name = String(raw.name ?? "").trim();
    if (!name) throw new Error(`Entry ${i + 1} missing name`);
    const algorithm = (raw.algorithm as HardcodedPasswordEntry["algorithm"]) || "aes256";
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : generateId(),
      name,
      password: String(raw.password ?? ""),
      ciphertext: String(raw.ciphertext ?? ""),
      algorithm,
      encryptionKey: String(raw.encryptionKey ?? ""),
      iv: raw.iv ? String(raw.iv) : undefined,
      allowCopy: raw.allowCopy !== false,
      notes: raw.notes ? String(raw.notes) : undefined,
      favorite: Boolean(raw.favorite),
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    } satisfies HardcodedPasswordEntry;
  });
}

export type PlainVaultExport = {
  format: "KRYPTIX-PLAIN-JSON";
  version: 1;
  exportedAt: number;
  passwords: PasswordEntry[];
  recoveryPhrases: RecoveryPhraseEntry[];
  hardcoded: HardcodedPasswordEntry[];
};

export function plainVaultToJson(
  passwords: PasswordEntry[],
  recovery: RecoveryPhraseEntry[],
  hardcoded: HardcodedPasswordEntry[]
): string {
  const payload: PlainVaultExport = {
    format: "KRYPTIX-PLAIN-JSON",
    version: 1,
    exportedAt: Date.now(),
    passwords,
    recoveryPhrases: recovery,
    hardcoded,
  };
  return JSON.stringify(payload, null, 2);
}

export function plainVaultFromJson(text: string): PlainVaultExport {
  const data = JSON.parse(text) as PlainVaultExport;
  if (data.format !== "KRYPTIX-PLAIN-JSON") {
    if (Array.isArray(data)) {
      return {
        format: "KRYPTIX-PLAIN-JSON",
        version: 1,
        exportedAt: Date.now(),
        passwords: passwordsFromJson(text),
        recoveryPhrases: [],
        hardcoded: [],
      };
    }
    throw new Error("Not a Kryptix plain JSON vault");
  }
  return {
    format: "KRYPTIX-PLAIN-JSON",
    version: 1,
    exportedAt: data.exportedAt || Date.now(),
    passwords: Array.isArray(data.passwords) ? data.passwords : [],
    recoveryPhrases: Array.isArray(data.recoveryPhrases) ? data.recoveryPhrases : [],
    hardcoded: Array.isArray(data.hardcoded) ? data.hardcoded : [],
  };
}
