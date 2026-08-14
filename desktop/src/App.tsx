import { useEffect, useState } from "react";
import {
  vaultExists,
  createVault,
  unlockVault,
  lockVault,
  isUnlocked,
} from "./lib/storage";
import VaultTabs, { type VaultSection } from "./components/VaultTabs";
import PasswordsPanel from "./components/PasswordsPanel";
import RecoveryPhrasesPanel from "./components/RecoveryPhrasesPanel";
import HardcodedPanel from "./components/HardcodedPanel";
import "./App.css";

type Mode = "loading" | "create" | "unlock" | "unlocked";

function App() {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [section, setSection] = useState<VaultSection>("passwords");

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
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleUnlock() {
    setError("");
    try {
      await unlockVault(password);
      setPassword("");
      setMode("unlocked");
    } catch (e) {
      setError(String(e));
    }
  }

  function handleLock() {
    lockVault();
    setMode("unlock");
    setSection("passwords");
  }

  if (mode === "loading") {
    return (
      <div className="app">
        <main className="main single">
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

      <main className={`main ${mode === "unlocked" ? "single" : ""}`}>
        {(mode === "create" || mode === "unlock") && (
          <section className="card login-card">
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
          </section>
        )}

        {mode === "unlocked" && (
          <div className="vault-shell">
            <VaultTabs active={section} onChange={setSection} />
            {section === "passwords" && (
              <PasswordsPanel onLock={handleLock} />
            )}
            {section === "recovery" && (
              <RecoveryPhrasesPanel onLock={handleLock} />
            )}
            {section === "hardcoded" && (
              <HardcodedPanel onLock={handleLock} />
            )}
          </div>
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
