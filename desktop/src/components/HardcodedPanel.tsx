import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generateId,
  encryptPassword,
  decryptPassword,
  ENCRYPTION_OPTIONS,
  type HardcodedPasswordEntry,
  type EncryptionAlgorithm,
} from "@kryptix/core";
import { loadHardcoded, saveHardcoded } from "../lib/storage";
import ConfirmDelete from "./ConfirmDelete";

type FormState = {
  name: string;
  password: string;
  algorithm: EncryptionAlgorithm;
  encryptionKey: string;
  allowCopy: boolean;
  notes: string;
  favorite: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  password: "",
  algorithm: "aes256",
  encryptionKey: "",
  allowCopy: true,
  notes: "",
  favorite: false,
});

export default function HardcodedPanel() {
  const [entries, setEntries] = useState<HardcodedPasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await loadHardcoded());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q) ||
        e.algorithm.toLowerCase().includes(q)
    );
  }, [entries, search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(entry: HardcodedPasswordEntry) {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      password: entry.password,
      algorithm: entry.algorithm,
      encryptionKey: entry.encryptionKey,
      allowCopy: entry.allowCopy,
      notes: entry.notes ?? "",
      favorite: entry.favorite ?? false,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSave() {
    setError("");
    if (!form.name.trim() || !form.password) {
      setError("Name and password are required");
      return;
    }
    const needsKey = ENCRYPTION_OPTIONS.find(
      (o) => o.value === form.algorithm
    )?.needsKey;
    if (needsKey && !form.encryptionKey) {
      setError("Encryption key is required for this algorithm");
      return;
    }

    try {
      const now = Date.now();
      const enc = await encryptPassword(
        form.password,
        form.algorithm,
        form.encryptionKey
      );

      let next: HardcodedPasswordEntry[];
      if (editingId) {
        next = entries.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name: form.name.trim(),
                password: form.password,
                ciphertext: enc.ciphertext,
                algorithm: form.algorithm,
                encryptionKey: form.encryptionKey,
                iv: enc.iv,
                allowCopy: form.allowCopy,
                notes: form.notes.trim() || undefined,
                favorite: form.favorite,
                updatedAt: now,
              }
            : e
        );
      } else {
        next = [
          {
            id: generateId(),
            name: form.name.trim(),
            password: form.password,
            ciphertext: enc.ciphertext,
            algorithm: form.algorithm,
            encryptionKey: form.encryptionKey,
            iv: enc.iv,
            allowCopy: form.allowCopy,
            notes: form.notes.trim() || undefined,
            favorite: form.favorite,
            createdAt: now,
            updatedAt: now,
          },
          ...entries,
        ];
      }

      await saveHardcoded(next);
      setEntries(next);
      closeForm();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(id: string) {
    setPendingDelete(null);
    try {
      const next = entries.filter((e) => e.id !== id);
      await saveHardcoded(next);
      setEntries(next);
    } catch (e) {
      setError(String(e));
    }
  }

  async function toggleFavorite(entry: HardcodedPasswordEntry) {
    try {
      const next = entries.map((e) =>
        e.id === entry.id
          ? { ...e, favorite: !e.favorite, updatedAt: Date.now() }
          : e
      );
      await saveHardcoded(next);
      setEntries(next);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDecrypt(entry: HardcodedPasswordEntry) {
    setError("");
    try {
      const plain = await decryptPassword(
        entry.ciphertext,
        entry.algorithm,
        entry.encryptionKey,
        entry.iv
      );
      setDecrypted((p) => ({ ...p, [entry.id]: plain }));
      setRevealed((p) => ({ ...p, [entry.id]: true }));
    } catch (e) {
      setError(`Decrypt failed: ${String(e)}`);
    }
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  const needsKey = ENCRYPTION_OPTIONS.find(
    (o) => o.value === form.algorithm
  )?.needsKey;

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div className="panel-title-row">
          <h2 className="hardcoded-title">Hardcoded</h2>
          <span className="badge">{entries.length}</span>
        </div>
        <div className="panel-actions">
          <input
            className="input search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn primary" onClick={openAdd}>
            + Add
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="form-card">
          <h3>{editingId ? "Edit hardcoded password" : "New hardcoded password"}</h3>
          <div className="form-grid">
            <input
              className="input"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="input"
              value={form.algorithm}
              onChange={(e) =>
                setForm({
                  ...form,
                  algorithm: e.target.value as EncryptionAlgorithm,
                })
              }
            >
              {ENCRYPTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Password (plaintext) *"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {needsKey && (
              <input
                className="input"
                placeholder="Encryption key *"
                value={form.encryptionKey}
                onChange={(e) =>
                  setForm({ ...form, encryptionKey: e.target.value })
                }
              />
            )}
            <textarea
              className="input notes"
              placeholder="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.allowCopy}
                onChange={(e) =>
                  setForm({ ...form, allowCopy: e.target.checked })
                }
              />
              Allow copy
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(e) =>
                  setForm({ ...form, favorite: e.target.checked })
                }
              />
              Favorite
            </label>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={handleSave}>
              {editingId ? "Save changes" : "Add entry"}
            </button>
            <button className="btn" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>{search ? "No matches." : "No hardcoded passwords yet."}</p>
          {!search && (
            <button className="btn primary" onClick={openAdd}>
              Add your first entry
            </button>
          )}
        </div>
      ) : (
        <div className="entry-list">
          {filtered.map((entry) => (
            <div key={entry.id} className="entry-row">
              <div className="entry-main">
                <div className="entry-head">
                  <button
                    className="star-btn"
                    onClick={() => toggleFavorite(entry)}
                  >
                    {entry.favorite ? "★" : "☆"}
                  </button>
                  <strong className="entry-site">{entry.name}</strong>
                  <span className="entry-url">{entry.algorithm}</span>
                </div>
                <div className="entry-meta">
                  <span className="mono pwd">
                    {revealed[entry.id]
                      ? decrypted[entry.id] ?? entry.password
                      : "•".repeat(10)}
                  </span>
                </div>
                {entry.notes && (
                  <p className="entry-notes">{entry.notes}</p>
                )}
              </div>
              <div className="entry-actions">
                <button
                  className="btn sm"
                  onClick={() =>
                    revealed[entry.id]
                      ? setRevealed((p) => ({ ...p, [entry.id]: false }))
                      : handleDecrypt(entry)
                  }
                >
                  {revealed[entry.id] ? "Hide" : "Decrypt"}
                </button>
                {entry.allowCopy && (
                  <button
                    className="btn sm"
                    onClick={() =>
                      copyText(
                        entry.id,
                        decrypted[entry.id] ?? entry.password
                      )
                    }
                  >
                    {copiedId === entry.id ? "Copied" : "Copy"}
                  </button>
                )}
                <button className="btn sm" onClick={() => openEdit(entry)}>
                  Edit
                </button>
                {pendingDelete === entry.id ? (
                  <ConfirmDelete
                    onConfirm={() => handleDelete(entry.id)}
                    onCancel={() => setPendingDelete(null)}
                  />
                ) : (
                  <button
                    className="btn sm danger"
                    onClick={() => setPendingDelete(entry.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
