import { useEffect, useState } from "react";
import {
  vaultExists,
  createVault,
  unlockVault,
  lockVault,
  isUnlocked,
  loadPasswords,
  savePasswords,
} from "./lib/storage";
import { generateId, type PasswordEntry } from "@kryptix/core";
import "./App.css";

type Mode = "loading" | "create" | "unlock" | "unlocked";

function App() {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [entryCount, setEntryCount] = useState(0);

  useEffect(() => {
    vaultExists()
      .then((exists) => setMode(exists ? "unlock" : "create"))
      .catch((e) => {
        setError(String(e));
        setMode("create");
      });
  }, []);

  async function handleCreate() {
    setError("");
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await createVault(password);
      setPassword("");
      setConfirm("");
      setMode("unlocked");
      setStatus("Vault created and unlocked");
      setEntryCount(0);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleUnlock() {
    setError("");
    try {
      await unlockVault(password);
      setPassword("");
      const vault = await loadPasswords();
      setEntryCount(vault.length);
      setMode("unlocked");
      setStatus(`Unlocked — ${vault.length} password(s)`);
    } catch (e) {
      setError(String(e));
    }
  }

  function handleLock() {
    lockVault();
    setMode("unlock");
    setStatus("Locked");
    setEntryCount(0);
  }

  async function handleAddDemo() {
    setError("");
    try {
      const vault = await loadPasswords();
      const now = Date.now();
      const entry: PasswordEntry = {
        id: generateId(),
        site: "demo.kryptix.app",
        username: "demo-user",
        password: "demo-secret-" + Math.random().toString(36).slice(2, 8),
        createdAt: now,
        updatedAt: now,
      };
      vault.push(entry);
      await savePasswords(vault);
      setEntryCount(vault.length);
      setStatus(`Saved demo entry — ${vault.length} total`);
    } catch (e) {
      setError(String(e));
    }
  }

  if (mode === "loading") {
    return (
      <div className="app">
        <main className="main" style={{ gridTemplateColumns: "1fr" }}>
          <section className="card">
            <p>Loading…</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo-row">
          <div className="sphere" aria-hidden />
          <h1 className="title">KRYPTIX</h1>
        </div>
        <p className="subtitle">
          Secure vault • Desktop
          {isUnlocked() ? " • Unlocked" : " • Locked"}
        </p>
      </header>

      <main className="main">
        {(mode === "create" || mode === "unlock") && (
          <section className="card">
            <h2>{mode === "create" ? "Create vault" : "Unlock vault"}</h2>
            <p>
              {mode === "create"
                ? "Choose a master password. It is never stored — only used to encrypt your data."
                : "Enter your master password to decrypt the vault."}
            </p>

            <div className="form">
              <input
                type="password"
                className="input"
                placeholder="Master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    mode === "create" ? handleCreate() : handleUnlock();
                  }
                }}
              />
              {mode === "create" && (
                <input
                  type="password"
                  className="input"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
              )}
              <div className="actions">
                <button
                  className="btn primary"
                  onClick={mode === "create" ? handleCreate : handleUnlock}
                >
                  {mode === "create" ? "Create vault" : "Unlock"}
                </button>
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            {status && <p className="status">{status}</p>}
          </section>
        )}

        {mode === "unlocked" && (
          <>
            <section className="card">
              <h2>Vault unlocked</h2>
              <p>
                Encrypted storage is working. Passwords are AES-256 encrypted
                with your master password before being written to disk.
              </p>
              <p className="status">Entries in vault: {entryCount}</p>

              <div className="actions">
                <button className="btn primary" onClick={handleAddDemo}>
                  Add demo password
                </button>
                <button className="btn" onClick={handleLock}>
                  Lock vault
                </button>
              </div>

              {error && <p className="error">{error}</p>}
              {status && <p className="status">{status}</p>}
            </section>

            <section className="card muted">
              <h3>Storage details</h3>
              <ul>
                <li>Plugin: @tauri-apps/plugin-store</li>
                <li>File: kryptix-vault.json (app data dir)</li>
                <li>Cipher: AES-256-CBC via @kryptix/core</li>
                <li>Master password never written to disk</li>
              </ul>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <span>Kryptix Desktop v0.1.0</span>
        <span>Tauri 2 + React + TypeScript</span>
      </footer>
    </div>
  );
}

export default App;
