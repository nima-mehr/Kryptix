import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  decryptVaultFile,
  parseVaultFileJson,
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
  passwordsFromJson,
  passwordsFromCsv,
  recoveryFromJson,
  recoveryFromCsv,
  hardcodedFromJson,
  plainVaultFromJson,
} from "../lib/importExport";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: (msg: string) => void;
};

type Pending = {
  path: string;
  content: string;
  kind: "kryptix" | "plain" | "passwords-json" | "passwords-csv" | "recovery-json" | "recovery-csv" | "hardcoded-json";
};

function detectKind(path: string, content: string): Pending["kind"] {
  const lower = path.toLowerCase();
  if (lower.endsWith(".kryptix")) return "kryptix";
  if (lower.endsWith(".csv")) {
    const header = content.split(/\r?\n/)[0]?.toLowerCase() ?? "";
    if (header.includes("phrase") || header.includes("seed") || header.includes("mnemonic")) {
      return "recovery-csv";
    }
    return "passwords-csv";
  }
  try {
    const data = JSON.parse(content);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      if (data.format === "KRYPTIX-PLAIN-JSON") return "plain";
      if (data.meta && data.ciphertext && data.mac) return "kryptix";
      if (Array.isArray(data.passwords) || Array.isArray(data.recoveryPhrases)) return "plain";
    }
    if (Array.isArray(data) && data.length > 0) {
      const sample = data[0] || {};
      if ("phrase" in sample || "seed" in sample || "mnemonic" in sample) return "recovery-json";
      if ("ciphertext" in sample || "algorithm" in sample) return "hardcoded-json";
      return "passwords-json";
    }
    if (Array.isArray(data)) return "passwords-json";
  } catch {
    /* fall through */
  }
  return "passwords-json";
}

async function mergePasswords(incoming: PasswordEntry[], replace: boolean): Promise<number> {
  if (replace) { await savePasswords(incoming); return incoming.length; }
  const existing = await loadPasswords();
  const ids = new Set(existing.map((e) => e.id));
  const merged = [...existing];
  let n = 0;
  for (const e of incoming) { if (!ids.has(e.id)) { merged.push(e); n++; } }
  await savePasswords(merged);
  return n;
}
async function mergeRecovery(incoming: RecoveryPhraseEntry[], replace: boolean): Promise<number> {
  if (replace) { await saveRecovery(incoming); return incoming.length; }
  const existing = await loadRecovery();
  const ids = new Set(existing.map((e) => e.id));
  const merged = [...existing];
  let n = 0;
  for (const e of incoming) { if (!ids.has(e.id)) { merged.push(e); n++; } }
  await saveRecovery(merged);
  return n;
}
async function mergeHardcoded(incoming: HardcodedPasswordEntry[], replace: boolean): Promise<number> {
  if (replace) { await saveHardcoded(incoming); return incoming.length; }
  const existing = await loadHardcoded();
  const ids = new Set(existing.map((e) => e.id));
  const merged = [...existing];
  let n = 0;
  for (const e of incoming) { if (!ids.has(e.id)) { merged.push(e); n++; } }
  await saveHardcoded(merged);
  return n;
}

export default function ImportModal({ open, onClose, onImported }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickedName, setPickedName] = useState("");

  if (!open) return null;

  function handleClose() {
    setPending(null); setPassphrase(""); setReplace(false);
    setError(""); setBusy(false); setPickedName(""); onClose();
  }

  async function pickFile() {
    setError(""); setPending(null); setPassphrase("");
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Kryptix / JSON / CSV", extensions: ["kryptix", "json", "csv"] }],
      });
      if (!selected || typeof selected !== "string") return;
      const content = await readTextFile(selected);
      const kind = detectKind(selected, content);
      const name = selected.split(/[/\\]/).pop() || selected;
      setPickedName(name);
      setPending({ path: selected, content, kind });
    } catch (e) {
      setError(String(e));
    }
  }

  async function runImport() {
    if (!pending) return;
    setError("");
    if (pending.kind === "kryptix" && !passphrase) {
      setError("Enter the export passphrase");
      return;
    }
    setBusy(true);
    try {
      let msg = "";
      const { content, kind } = pending;
      if (kind === "kryptix") {
        const vaultFile = parseVaultFileJson(content);
        const payload = await decryptVaultFile(vaultFile, passphrase);
        const p = vaultFile.meta.includePasswords ? await mergePasswords(payload.passwords, replace) : 0;
        const r = vaultFile.meta.includeRecovery ? await mergeRecovery(payload.recoveryPhrases, replace) : 0;
        const h = vaultFile.meta.includeHardcoded ? await mergeHardcoded(payload.hardcoded, replace) : 0;
        msg = `Imported — passwords: ${p}, recovery: ${r}, hardcoded: ${h}`;
      } else if (kind === "plain") {
        const vault = plainVaultFromJson(content);
        const p = await mergePasswords(vault.passwords, replace);
        const r = await mergeRecovery(vault.recoveryPhrases, replace);
        const h = await mergeHardcoded(vault.hardcoded, replace);
        msg = `Imported — passwords: ${p}, recovery: ${r}, hardcoded: ${h}`;
      } else if (kind === "passwords-json") {
        msg = `Imported ${await mergePasswords(passwordsFromJson(content), replace)} password(s)`;
      } else if (kind === "passwords-csv") {
        msg = `Imported ${await mergePasswords(passwordsFromCsv(content), replace)} password(s)`;
      } else if (kind === "recovery-json") {
        msg = `Imported ${await mergeRecovery(recoveryFromJson(content), replace)} recovery phrase(s)`;
      } else if (kind === "recovery-csv") {
        msg = `Imported ${await mergeRecovery(recoveryFromCsv(content), replace)} recovery phrase(s)`;
      } else if (kind === "hardcoded-json") {
        const n = await mergeHardcoded(hardcodedFromJson(content), replace);
        msg = `Imported ${n} hardcoded entr${n === 1 ? "y" : "ies"}`;
      }
      onImported?.(msg);
      handleClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const needsPassphrase = pending?.kind === "kryptix";

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import</h2>
          <button className="btn sm" onClick={handleClose}>Close</button>
        </div>
        <div className="modal-body">
          <p className="muted">
            Choose a .kryptix, JSON, or CSV file. Format is detected automatically.
          </p>
          <div className="actions">
            <button className="btn primary" onClick={pickFile} disabled={busy}>
              {pending ? "Choose another file" : "Choose file"}
            </button>
          </div>
          {pickedName && (
            <p className="status file-picked">
              Selected: {pickedName}
              {pending && <span className="detect-kind"> · {pending.kind}</span>}
            </p>
          )}
          {pending && (
            <>
              <div className="import-mode">
                <label className="check-label">
                  <input type="radio" name="import-mode" checked={!replace} onChange={() => setReplace(false)} />
                  Merge (skip existing IDs)
                </label>
                <label className="check-label">
                  <input type="radio" name="import-mode" checked={replace} onChange={() => setReplace(true)} />
                  Replace section(s)
                </label>
              </div>
              {needsPassphrase && (
                <div className="form">
                  <input
                    type="password"
                    className="input"
                    placeholder="Export passphrase"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runImport(); }}
                    autoFocus
                  />
                </div>
              )}
              <div className="actions">
                <button className="btn primary" disabled={busy} onClick={runImport}>
                  {busy ? "Importing…" : "Import"}
                </button>
                <button className="btn" onClick={handleClose}>Cancel</button>
              </div>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
