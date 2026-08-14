import { useCallback, useEffect, useMemo, useState } from "react";
import { generateId, type PasswordEntry } from "@kryptix/core";
import { loadPasswords, savePasswords } from "../lib/storage";

type FormState = {
  site: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  favorite: boolean;
};

const emptyForm = (): FormState => ({
  site: "",
  url: "",
  username: "",
  password: "",
  notes: "",
  favorite: false,
});

type Props = {
  onLock: () => void;
};

export default function PasswordsPanel({ onLock }: Props) {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
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
      const vault = await loadPasswords();
      setEntries(vault);
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
        e.site.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.url ?? "").toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(entry: PasswordEntry) {
    setEditingId(entry.id);
    setForm({
      site: entry.site,
      url: entry.url ?? "",
      username: entry.username,
      password: entry.password,
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
    if (!form.site.trim() || !form.username.trim() || !form.password) {
      setError("Site, username, and password are required");
      return;
    }

    try {
      const now = Date.now();
      let next: PasswordEntry[];

      if (editingId) {
        next = entries.map((e) =>
          e.id === editingId
            ? {
                ...e,
                site: form.site.trim(),
                url: form.url.trim() || undefined,
                username: form.username.trim(),
                password: form.password,
                notes: form.notes.trim() || undefined,
                favorite: form.favorite,
                updatedAt: now,
              }
            : e
        );
      } else {
        const entry: PasswordEntry = {
          id: generateId(),
          site: form.site.trim(),
          url: form.url.trim() || undefined,
          username: form.username.trim(),
          password: form.password,
          notes: form.notes.trim() || undefined,
          favorite: form.favorite,
          createdAt: now,
          updatedAt: now,
        };
        next = [entry, ...entries];
      }

      await savePasswords(next);
      setEntries(next);
      closeForm();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this password?")) return;
    setError("");
    try {
      const next = entries.filter((e) => e.id !== id);
      await savePasswords(next);
      setEntries(next);
    } catch (e) {
      setError(String(e));
    }
  }

  async function toggleFavorite(entry: PasswordEntry) {
    setError("");
    try {
      const next = entries.map((e) =>
        e.id === entry.id
          ? { ...e, favorite: !e.favorite, updatedAt: Date.now() }
          : e
      );
      await savePasswords(next);
      setEntries(next);
    } catch (e) {
      setError(String(e));
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

  function toggleReveal(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div className="panel-title-row">
          <h2>Passwords</h2>
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
          <h3>{editingId ? "Edit password" : "New password"}</h3>
          <div className="form-grid">
            <input
              className="input"
              placeholder="Site / name *"
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
            />
            <input
              className="input"
              placeholder="URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <input
              className="input"
              placeholder="Username *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
              className="input"
              placeholder="Password *"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {editingId ? "Save changes" : "Add password"}
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
          <p>{search ? "No matches." : "No passwords yet."}</p>
          {!search && (
            <button className="btn primary" onClick={openAdd}>
              Add your first password
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
                  <strong className="entry-site">{entry.site}</strong>
                  {entry.url && (
                    <span className="entry-url">{entry.url}</span>
                  )}
                </div>
                <div className="entry-meta">
                  <span className="mono">{entry.username}</span>
                  <span className="mono pwd">
                    {revealed[entry.id]
                      ? entry.password
                      : "•".repeat(Math.min(entry.password.length, 12))}
                  </span>
                </div>
                {entry.notes && (
                  <p className="entry-notes">{entry.notes}</p>
                )}
              </div>
              <div className="entry-actions">
                <button
                  className="btn sm"
                  onClick={() => toggleReveal(entry.id)}
                >
                  {revealed[entry.id] ? "Hide" : "Show"}
                </button>
                <button
                  className="btn sm"
                  onClick={() => copyText(entry.id + "-u", entry.username)}
                >
                  {copiedId === entry.id + "-u" ? "Copied" : "User"}
                </button>
                <button
                  className="btn sm"
                  onClick={() => copyText(entry.id + "-p", entry.password)}
                >
                  {copiedId === entry.id + "-p" ? "Copied" : "Pass"}
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
