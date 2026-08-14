import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  buildPayload,
  encryptVaultFile,
  decryptVaultFile,
  parseVaultFileJson,
  type KryptixSectionFlags,
  type PasswordEntry,
  type RecoveryPhraseEntry,
  type HardcodedPasswordEntry,
} from "@kryptix/core";
import {
  loadPasswords,
  savePasswords,
  loadRecovery,
  saveRecovery,
  loadHardcoded,
  saveHardcoded,
} from "../lib/storage";
import {
  passwordsToJson,
  passwordsFromJson,
  passwordsToCsv,
  passwordsFromCsv,
  recoveryToJson,
  recoveryFromJson,
  recoveryToCsv,
  recoveryFromCsv,
  hardcodedToJson,
  hardcodedFromJson,
  plainVaultToJson,
  plainVaultFromJson,
} from "../lib/importExport";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

type Mode = "menu" | "export" | "import";
type Format =
  | "kryptix"
  | "plain-json"
  | "passwords-json"
  | "passwords-csv"
  | "recovery-json"
  | "recovery-csv"
  | "hardcoded-json";

const FORMAT_OPTIONS: { id: Format; label: string; hint: string }[] = [
  { id: "kryptix", label: ".kryptix (encrypted)", hint: "Full vault, AES-256 + passphrase. Best for secure backup." },
  { id: "plain-json", label: "Plain JSON (all sections)", hint: "Unencrypted. Good for migration / inspection." },
  { id: "passwords-json", label: "Passwords · JSON", hint: "Passwords section only." },
  { id: "passwords-csv", label: "Passwords · CSV", hint: "Compatible with many password managers." },
  { id: "recovery-json", label: "Recovery · JSON", hint: "Recovery phrases only." },
  { id: "recovery-csv", label: "Recovery · CSV", hint: "name, phrase, notes, favorite." },
  { id: "hardcoded-json", label: "Hardcoded · JSON", hint: "Includes ciphertext + algorithm metadata." },
];

function extFor(format: Format): string {
  if (format === "kryptix") return "kryptix";
  if (format.includes("csv")) return "csv";
  return "json";
}

function filtersFor(format: Format) {
  const ext = extFor(format);
  const name = format === "kryptix" ? "Kryptix vault" : format.includes("csv") ? "CSV" : "JSON";
  return [{ name, extensions: [ext] }];
}

export default function BackupModal({ open: isOpen, onClose, onImported }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [format, setFormat] = useState<Format>("kryptix");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sections, setSections] = useState<KryptixSectionFlags>({
    passwords: true, recovery: true, hardcoded: true,
  });
  const [importMode, setImportMode] = useState<"merge" | "replaceSections">("merge");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  function reset() {
    setMode("menu"); setFormat("kryptix"); setPassphrase(""); setConfirm("");
    setStatus(""); setError(""); setBusy(false);
  }
  function handleClose() { reset(); onClose(); }

  async function mergeOrReplacePasswords(incoming: PasswordEntry[], replace: boolean): Promise<number> {
    if (replace) { await savePasswords(incoming); return incoming.length; }
    const existing = await loadPasswords();
    const ids = new Set(existing.map((e) => e.id));
    const merged = [...existing];
    let n = 0;
    for (const e of incoming) { if (!ids.has(e.id)) { merged.push(e); n++; } }
    await savePasswords(merged);
    return n;
  }
  async function mergeOrReplaceRecovery(incoming: RecoveryPhraseEntry[], replace: boolean): Promise<number> {
    if (replace) { await saveRecovery(incoming); return incoming.length; }
    const existing = await loadRecovery();
    const ids = new Set(existing.map((e) => e.id));
    const merged = [...existing];
    let n = 0;
    for (const e of incoming) { if (!ids.has(e.id)) { merged.push(e); n++; } }
    await saveRecovery(merged);
    return n;
  }
  async function mergeOrReplaceHardcoded(incoming: HardcodedPasswordEntry[], replace: boolean): Promise<number> {
    if (replace) { await saveHardcoded(incoming); return incoming.length; }
    const existing = await loadHardcoded();
    const ids = new Set(existing.map((e) => e.id));
    const merged = [...existing];
    let n = 0;
    for (const e of incoming) { if (!ids.has(e.id)) { merged.push(e); n++; } }
    await saveHardcoded(merged);
    return n;
  }

  async function handleExport() {
    setError(""); setStatus("");
    if (format === "kryptix") {
      if (passphrase.length < 4) { setError("Export passphrase must be at least 4 characters"); return; }
      if (passphrase !== confirm) { setError("Passphrases do not match"); return; }
      if (!sections.passwords && !sections.recovery && !sections.hardcoded) {
        setError("Select at least one section"); return;
      }
    }
    setBusy(true);
    try {
      let content = "";
      let defaultName = `kryptix-export-${new Date().toISOString().slice(0, 10)}`;
      if (format === "kryptix") {
        const [passwords, recovery, hardcoded] = await Promise.all([
          sections.passwords ? loadPasswords() : Promise.resolve([]),
          sections.recovery ? loadRecovery() : Promise.resolve([]),
          sections.hardcoded ? loadHardcoded() : Promise.resolve([]),
        ]);
        const payload = buildPayload(sections, passwords, recovery, hardcoded);
        const file = await encryptVaultFile(payload, passphrase, sections);
        content = JSON.stringify(file, null, 2);
        defaultName += ".kryptix";
      } else if (format === "plain-json") {
        const [passwords, recovery, hardcoded] = await Promise.all([loadPasswords(), loadRecovery(), loadHardcoded()]);
        content = plainVaultToJson(passwords, recovery, hardcoded);
        defaultName += "-full.json";
      } else if (format === "passwords-json") {
        content = passwordsToJson(await loadPasswords()); defaultName += "-passwords.json";
      } else if (format === "passwords-csv") {
        content = passwordsToCsv(await loadPasswords()); defaultName += "-passwords.csv";
      } else if (format === "recovery-json") {
        content = recoveryToJson(await loadRecovery()); defaultName += "-recovery.json";
      } else if (format === "recovery-csv") {
        content = recoveryToCsv(await loadRecovery()); defaultName += "-recovery.csv";
      } else if (format === "hardcoded-json") {
        content = hardcodedToJson(await loadHardcoded()); defaultName += "-hardcoded.json";
      }
      const path = await save({ defaultPath: defaultName, filters: filtersFor(format) });
      if (!path) { setBusy(false); return; }
      await writeTextFile(path, content);
      setStatus(`Exported to ${path}`);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function handleImport() {
    setError(""); setStatus("");
    if (format === "kryptix" && !passphrase) { setError("Enter the export passphrase"); return; }
    setBusy(true);
    try {
      const selected = await open({ multiple: false, filters: filtersFor(format) });
      if (!selected || typeof selected !== "string") { setBusy(false); return; }
      const content = await readTextFile(selected);
      const replace = importMode === "replaceSections";
      let msg = "";
      if (format === "kryptix") {
        const vaultFile = parseVaultFileJson(content);
        const payload = await decryptVaultFile(vaultFile, passphrase);
        let p = 0, r = 0, h = 0;
        if (sections.passwords && vaultFile.meta.includePasswords) p = await mergeOrReplacePasswords(payload.passwords, replace);
        if (sections.recovery && vaultFile.meta.includeRecovery) r = await mergeOrReplaceRecovery(payload.recoveryPhrases, replace);
        if (sections.hardcoded && vaultFile.meta.includeHardcoded) h = await mergeOrReplaceHardcoded(payload.hardcoded, replace);
        msg = `Imported — passwords: ${p}, recovery: ${r}, hardcoded: ${h}`;
      } else if (format === "plain-json") {
        const vault = plainVaultFromJson(content);
        const p = await mergeOrReplacePasswords(vault.passwords, replace);
        const r = await mergeOrReplaceRecovery(vault.recoveryPhrases, replace);
        const h = await mergeOrReplaceHardcoded(vault.hardcoded, replace);
        msg = `Imported — passwords: ${p}, recovery: ${r}, hardcoded: ${h}`;
      } else if (format === "passwords-json") {
        msg = `Imported ${await mergeOrReplacePasswords(passwordsFromJson(content), replace)} password(s)`;
      } else if (format === "passwords-csv") {
        msg = `Imported ${await mergeOrReplacePasswords(passwordsFromCsv(content), replace)} password(s)`;
      } else if (format === "recovery-json") {
        msg = `Imported ${await mergeOrReplaceRecovery(recoveryFromJson(content), replace)} recovery phrase(s)`;
      } else if (format === "recovery-csv") {
        msg = `Imported ${await mergeOrReplaceRecovery(recoveryFromCsv(content), replace)} recovery phrase(s)`;
      } else if (format === "hardcoded-json") {
        const n = await mergeOrReplaceHardcoded(hardcodedFromJson(content), replace);
        msg = `Imported ${n} hardcoded entr${n === 1 ? "y" : "ies"}`;
      }
      setStatus(msg);
      onImported?.();
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  const needsPassphrase = format === "kryptix";
  const needsSections = format === "kryptix";

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === "menu" && "Import / Export"}
            {mode === "export" && "Export"}
            {mode === "import" && "Import"}
          </h2>
          <button className="btn sm" onClick={handleClose}>Close</button>
        </div>

        {mode === "menu" && (
          <div className="modal-body">
            <p className="muted">
              Encrypted .kryptix backup, or plain JSON / CSV for passwords and recovery phrases.
            </p>
            <div className="actions">
              <button className="btn primary" onClick={() => setMode("export")}>Export</button>
              <button className="btn" onClick={() => setMode("import")}>Import</button>
            </div>
          </div>
        )}

        {(mode === "export" || mode === "import") && (
          <div className="modal-body">
            <div className="format-list">
              {FORMAT_OPTIONS.map((f) => (
                <label key={f.id} className={`format-option ${format === f.id ? "active" : ""}`}>
                  <input type="radio" name="format" checked={format === f.id} onChange={() => setFormat(f.id)} />
                  <span><strong>{f.label}</strong><small>{f.hint}</small></span>
                </label>
              ))}
            </div>

            {needsSections && (
              <div className="section-checks">
                <label className="check-label">
                  <input type="checkbox" checked={sections.passwords}
                    onChange={(e) => setSections({ ...sections, passwords: e.target.checked })} />
                  Passwords
                </label>
                <label className="check-label">
                  <input type="checkbox" checked={sections.recovery}
                    onChange={(e) => setSections({ ...sections, recovery: e.target.checked })} />
                  Recovery phrases
                </label>
                <label className="check-label">
                  <input type="checkbox" checked={sections.hardcoded}
                    onChange={(e) => setSections({ ...sections, hardcoded: e.target.checked })} />
                  Hardcoded
                </label>
              </div>
            )}

            {mode === "import" && (
              <div className="import-mode">
                <label className="check-label">
                  <input type="radio" name="importMode" checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")} />
                  Merge (skip existing IDs)
                </label>
                <label className="check-label">
                  <input type="radio" name="importMode" checked={importMode === "replaceSections"}
                    onChange={() => setImportMode("replaceSections")} />
                  Replace section(s)
                </label>
              </div>
            )}

            {needsPassphrase && (
              <div className="form">
                <input type="password" className="input" placeholder="Export passphrase"
                  value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                {mode === "export" && (
                  <input type="password" className="input" placeholder="Confirm passphrase"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                )}
              </div>
            )}

            {error && <p className="error">{error}</p>}
            {status && <p className="status">{status}</p>}

            <div className="actions">
              <button className="btn primary" disabled={busy}
                onClick={mode === "export" ? handleExport : handleImport}>
                {busy ? "Working…" : mode === "export" ? "Choose file & export" : "Choose file & import"}
              </button>
              <button className="btn" onClick={() => setMode("menu")}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
