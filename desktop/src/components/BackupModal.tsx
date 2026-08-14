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

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

type Mode = "menu" | "export" | "import";

export default function BackupModal({
  open: isOpen,
  onClose,
  onImported,
}: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sections, setSections] = useState<KryptixSectionFlags>({
    passwords: true,
    recovery: true,
    hardcoded: true,
  });
  const [importMode, setImportMode] = useState<"merge" | "replaceSections">(
    "merge"
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  function reset() {
    setMode("menu");
    setPassphrase("");
    setConfirm("");
    setStatus("");
    setError("");
    setBusy(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleExport() {
    setError("");
    setStatus("");
    if (passphrase.length < 4) {
      setError("Export passphrase must be at least 4 characters");
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match");
      return;
    }
    if (!sections.passwords && !sections.recovery && !sections.hardcoded) {
      setError("Select at least one section");
      return;
    }

    setBusy(true);
    try {
      const [passwords, recovery, hardcoded] = await Promise.all([
        sections.passwords ? loadPasswords() : Promise.resolve([]),
        sections.recovery ? loadRecovery() : Promise.resolve([]),
        sections.hardcoded ? loadHardcoded() : Promise.resolve([]),
      ]);

      const payload = buildPayload(sections, passwords, recovery, hardcoded);
      const file = await encryptVaultFile(payload, passphrase, sections);
      const json = JSON.stringify(file, null, 2);

      const path = await save({
        defaultPath: `kryptix-backup-${new Date().toISOString().slice(0, 10)}.kryptix`,
        filters: [{ name: "Kryptix vault", extensions: ["kryptix"] }],
      });
      if (!path) {
        setBusy(false);
        return;
      }

      await writeTextFile(path, json);
      setStatus(`Exported to ${path}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setError("");
    setStatus("");
    if (!passphrase) {
      setError("Enter the export passphrase");
      return;
    }

    setBusy(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Kryptix vault", extensions: ["kryptix"] }],
      });
      if (!selected || typeof selected !== "string") {
        setBusy(false);
        return;
      }

      const content = await readTextFile(selected);
      const vaultFile = parseVaultFileJson(content);
      const payload = await decryptVaultFile(vaultFile, passphrase);

      const doPasswords =
        sections.passwords && vaultFile.meta.includePasswords;
      const doRecovery =
        sections.recovery && vaultFile.meta.includeRecovery;
      const doHardcoded =
        sections.hardcoded && vaultFile.meta.includeHardcoded;

      let pCount = 0;
      let rCount = 0;
      let hCount = 0;

      if (doPasswords) {
        if (importMode === "replaceSections") {
          await savePasswords(payload.passwords);
          pCount = payload.passwords.length;
        } else {
          const existing = await loadPasswords();
          const ids = new Set(existing.map((e) => e.id));
          const merged = [...existing];
          for (const e of payload.passwords as PasswordEntry[]) {
            if (!ids.has(e.id)) {
              merged.push(e);
              pCount++;
            }
          }
          await savePasswords(merged);
        }
      }

      if (doRecovery) {
        if (importMode === "replaceSections") {
          await saveRecovery(payload.recoveryPhrases);
          rCount = payload.recoveryPhrases.length;
        } else {
          const existing = await loadRecovery();
          const ids = new Set(existing.map((e) => e.id));
          const merged = [...existing];
          for (const e of payload.recoveryPhrases as RecoveryPhraseEntry[]) {
            if (!ids.has(e.id)) {
              merged.push(e);
              rCount++;
            }
          }
          await saveRecovery(merged);
        }
      }

      if (doHardcoded) {
        if (importMode === "replaceSections") {
          await saveHardcoded(payload.hardcoded);
          hCount = payload.hardcoded.length;
        } else {
          const existing = await loadHardcoded();
          const ids = new Set(existing.map((e) => e.id));
          const merged = [...existing];
          for (const e of payload.hardcoded as HardcodedPasswordEntry[]) {
            if (!ids.has(e.id)) {
              merged.push(e);
              hCount++;
            }
          }
          await saveHardcoded(merged);
        }
      }

      setStatus(
        `Imported — passwords: ${pCount}, recovery: ${rCount}, hardcoded: ${hCount}`
      );
      onImported?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === "menu" && "Backup"}
            {mode === "export" && "Export .kryptix"}
            {mode === "import" && "Import .kryptix"}
          </h2>
          <button className="btn sm" onClick={handleClose}>
            Close
          </button>
        </div>

        {mode === "menu" && (
          <div className="modal-body">
            <p className="muted">
              Full vault backup encrypted with a separate export passphrase.
            </p>
            <div className="actions">
              <button className="btn primary" onClick={() => setMode("export")}>
                Export
              </button>
              <button className="btn" onClick={() => setMode("import")}>
                Import
              </button>
            </div>
          </div>
        )}

        {(mode === "export" || mode === "import") && (
          <div className="modal-body">
            <div className="section-checks">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={sections.passwords}
                  onChange={(e) =>
                    setSections({ ...sections, passwords: e.target.checked })
                  }
                />
                Passwords
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={sections.recovery}
                  onChange={(e) =>
                    setSections({ ...sections, recovery: e.target.checked })
                  }
                />
                Recovery phrases
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={sections.hardcoded}
                  onChange={(e) =>
                    setSections({ ...sections, hardcoded: e.target.checked })
                  }
                />
                Hardcoded
              </label>
            </div>

            {mode === "import" && (
              <div className="import-mode">
                <label className="check-label">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                  />
                  Merge (skip existing IDs)
                </label>
                <label className="check-label">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "replaceSections"}
                    onChange={() => setImportMode("replaceSections")}
                  />
                  Replace selected sections
                </label>
              </div>
            )}

            <div className="form">
              <input
                type="password"
                className="input"
                placeholder="Export passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              {mode === "export" && (
                <input
                  type="password"
                  className="input"
                  placeholder="Confirm passphrase"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              )}
            </div>

            {error && <p className="error">{error}</p>}
            {status && <p className="status">{status}</p>}

            <div className="actions">
              <button
                className="btn primary"
                disabled={busy}
                onClick={mode === "export" ? handleExport : handleImport}
              >
                {busy
                  ? "Working…"
                  : mode === "export"
                    ? "Choose file & export"
                    : "Choose file & import"}
              </button>
              <button className="btn" onClick={() => setMode("menu")}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
