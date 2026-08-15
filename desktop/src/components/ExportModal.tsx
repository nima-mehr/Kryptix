import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  buildPayload,
  encryptVaultFile,
  type KryptixSectionFlags,
} from "@kryptix/core";
import {
  loadPasswords,
  loadRecovery,
  loadHardcoded,
} from "../lib/storage";
import {
  passwordsToJson,
  passwordsToCsv,
  recoveryToJson,
  recoveryToCsv,
  hardcodedToJson,
  plainVaultToJson,
} from "../lib/importExport";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone?: (msg: string) => void;
};

type Format =
  | "kryptix"
  | "plain-json"
  | "passwords-json"
  | "passwords-csv"
  | "recovery-json"
  | "recovery-csv"
  | "hardcoded-json";

const FORMAT_OPTIONS: { id: Format; label: string; hint: string }[] = [
  { id: "kryptix", label: ".kryptix (encrypted)", hint: "Full vault, AES-256 + passphrase." },
  { id: "plain-json", label: "Plain JSON (all sections)", hint: "Unencrypted. Good for migration." },
  { id: "passwords-json", label: "Passwords · JSON", hint: "Passwords only." },
  { id: "passwords-csv", label: "Passwords · CSV", hint: "site, url, username, password…" },
  { id: "recovery-json", label: "Recovery · JSON", hint: "Phrases only." },
  { id: "recovery-csv", label: "Recovery · CSV", hint: "name, phrase, notes…" },
  { id: "hardcoded-json", label: "Hardcoded · JSON", hint: "Ciphertext + algorithm metadata." },
];

function filtersFor(format: Format) {
  if (format === "kryptix") return [{ name: "Kryptix vault", extensions: ["kryptix"] }];
  if (format.includes("csv")) return [{ name: "CSV", extensions: ["csv"] }];
  return [{ name: "JSON", extensions: ["json"] }];
}

export default function ExportModal({ open, onClose, onDone }: Props) {
  const [format, setFormat] = useState<Format>("kryptix");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sections, setSections] = useState<KryptixSectionFlags>({
    passwords: true, recovery: true, hardcoded: true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function handleClose() {
    setFormat("kryptix"); setPassphrase(""); setConfirm(""); setError(""); setBusy(false); onClose();
  }

  async function handleExport() {
    setError("");
    if (format === "kryptix") {
      if (passphrase.length < 4) { setError("Passphrase must be at least 4 characters"); return; }
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
      onDone?.(`Exported to ${path}`);
      handleClose();
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export</h2>
          <button className="btn sm" onClick={handleClose}>Close</button>
        </div>
        <div className="modal-body">
          <div className="format-list">
            {FORMAT_OPTIONS.map((f) => (
              <label key={f.id} className={`format-option ${format === f.id ? "active" : ""}`}>
                <input type="radio" name="export-format" checked={format === f.id} onChange={() => setFormat(f.id)} />
                <span><strong>{f.label}</strong><small>{f.hint}</small></span>
              </label>
            ))}
          </div>
          {format === "kryptix" && (
            <>
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
              <div className="form">
                <input type="password" className="input" placeholder="Export passphrase"
                  value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                <input type="password" className="input" placeholder="Confirm passphrase"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            </>
          )}
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button className="btn primary" disabled={busy} onClick={handleExport}>
              {busy ? "Working…" : "Choose file & export"}
            </button>
            <button className="btn" onClick={handleClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
