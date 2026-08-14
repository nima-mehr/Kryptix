import { useCallback, useEffect, useMemo, useState } from "react";
import { generateId, countWords, type RecoveryPhraseEntry } from "@kryptix/core";
import { loadRecovery, saveRecovery } from "../lib/storage";

type FormState = {
  name: string;
  phrase: string;
  notes: string;
  favorite: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  phrase: "",
  notes: "",
  favorite: false,
});

type Props = {
  onLock: () => void;
};

export default function RecoveryPhrasesPanel({ onLock }: Props) {
  const [entries, setEntries] = useState<RecoveryPhraseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await loadRecovery());
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
        e.phrase.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(entry: RecoveryPhraseEntry) {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      phrase: entry.phrase,
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
    if (!form.name.trim() || !form.phrase.trim()) {
      setError("Name and phrase are required");
      return;
    }

    try {
      const now = Date.now();
      let next: RecoveryPhraseEntry[];

      if (editingId) {
        next = entries.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name: form.name.trim(),
                phrase: form.phrase.trim(),
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
            phrase: form.phrase.trim(),
            notes: form.notes.trim() || undefined,
            favorite: form.favorite,
            createdAt: now,
            updatedAt: now,
          },
          ...entries,
        ];
      }

      await saveRecovery(next);
      setEntries(next);
      closeForm();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recovery phrase?")) return;
    setError("");
    try {
      const next = entries.filter((e) => e.id !== id);
      await saveRecovery(next);
      setEntries(next);
    } catch (e) {
      setError(String(e));
    }
  }

  async function toggleFavorite(entry: RecoveryPhraseEntry) {
    try {
      const next = entries.map((e) =>
        e.id === entry.id
          ? { ...e, favorite: !e.favorite, updatedAt: Date.now() }
          : e
      );
      await saveRecovery(next);
      setEntries(next);
    } catch (e) {
      setError(String(e));
    }
  }

  async function copyPhrase(id: string, phrase: string) {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div className="panel-title-row">
          <h2>Recovery phrases</h2>
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
          <button className="btn" onClick={onLock}>
            Lock
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="form-card">
          <h3>{editingId ? "Edit recovery phrase" : "New recovery phrase"}</h3>
          <div className="form-grid">
            <input
              className="input"
              placeholder="Name (e.g. MetaMask) *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="word-count">
              {form.phrase.trim()
                ? `${countWords(form.phrase)} words`
                : "—"}
            </div>
            <textarea
              className="input notes phrase-input"
              placeholder="Seed / recovery phrase *"
              rows={3}
              value={form.phrase}
              onChange={(e) => setForm({ ...form, phrase: e.target.value })}
            />
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
              {editingId ? "Save changes" : "Add phrase"}
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
          <p>{search ? "No matches." : "No recovery phrases yet."}</p>
          {!search && (
            <button className="btn primary" onClick={openAdd}>
              Add your first phrase
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
                    title="Toggle favorite"
                    onClick={() => toggleFavorite(entry)}
                  >
                    {entry.favorite ? "★" : "☆"}
                  </button>
                  <strong className="entry-site">{entry.name}</strong>
                  <span className="entry-url">
                    {countWords(entry.phrase)} words
                  </span>
                </div>
                <div className="entry-meta">
                  <span className="mono pwd">
                    {revealed[entry.id]
                      ? entry.phrase
                      : "•".repeat(Math.min(24, entry.phrase.length))}
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
                    setRevealed((p) => ({ ...p, [entry.id]: !p[entry.id] }))
                  }
                >
                  {revealed[entry.id] ? "Hide" : "Show"}
                </button>
                <button
                  className="btn sm"
                  onClick={() => copyPhrase(entry.id, entry.phrase)}
                >
                  {copiedId === entry.id ? "Copied" : "Copy"}
                </button>
                <button className="btn sm" onClick={() => openEdit(entry)}>
                  Edit
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => handleDelete(entry.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
