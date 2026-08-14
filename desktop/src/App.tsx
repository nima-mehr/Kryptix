import { useCallback, useEffect, useState } from "react";
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
import BackupModal from "./components/BackupModal";
import ToastStack, { type ToastMessage, type ToastKind } from "./components/Toast";
import {
  useIdleLock,
  IDLE_OPTIONS,
  loadIdleTimeout,
  saveIdleTimeout,
} from "./hooks/useIdleLock";
import "./App.css";

type Mode = "loading" | "create" | "unlock" | "unlocked";

function App() {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [section, setSection] = useState<VaultSection>("passwords");
  const [backupOpen, setBackupOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [idleMs, setIdleMs] = useState(loadIdleTimeout);
  const [showSettings, setShowSettings] = useState(false);
  const toastId = useState(() => ({ n: 0 }))[0];

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    toastId.n += 1;
    const id = toastId.n;
    setToasts((prev) => [...prev, { id, text, kind }]);
  }, [toastId]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    vaultExists()
      .then((exists) => setMode(exists ? "unlock" : "create"))
      .catch((e) => {
        setError(String(e));
        setMode("create");
      });
  }, []);

  function handleLock(reason?: string) {
    lockVault();
    setMode("unlock");
    setSection("passwords");
    setBackupOpen(false);
    setShowSettings(false);
    if (reason) toast(reason, "info");
  }

  useIdleLock(mode === "unlocked", idleMs, () => {
    handleLock("Locked due to inactivity");
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        if (backupOpen) {
          setBackupOpen(false);
          e.preventDefault();
        } else if (showSettings) {
          setShowSettings(false);
          e.preventDefault();
        }
        return;
      }

      if (!mod) return;

      if (e.key === "l" || e.key === "L") {
        if (mode === "unlocked") {
          e.preventDefault();
          handleLock("Vault locked");
        }
        return;
      }

      if (e.key === "b" || e.key === "B") {
        if (mode === "unlocked") {
          e.preventDefault();
          setBackupOpen(true);
        }
        return;
      }

      if (mode === "unlocked" && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, VaultSection> = {
          "1": "passwords",
          "2": "recovery",
          "3": "hardcoded",
        };
        setSection(map[e.key]);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, backupOpen, showSettings]);

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
      toast("Vault created", "success");
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
      toast("Vault unlocked", "success");
    } catch (e) {
      setError(String(e));
      toast("Wrong password", "error");
    }
  }

  function changeIdle(ms: number) {
    setIdleMs(ms);
    saveIdleTimeout(ms);
    const label = IDLE_OPTIONS.find((o) => o.ms === ms)?.label ?? `${ms}ms`;
    toast(`Auto-lock: ${label}`, "success");
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
          {mode === "unlocked" && idleMs > 0
            ? ` • Auto-lock ${Math.round(idleMs / 60000)}m`
            : ""}
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
            <div className="vault-top">
              <VaultTabs active={section} onChange={setSection} />
              <div className="vault-top-actions">
                <button
                  className="btn sm"
                  onClick={() => setShowSettings((s) => !s)}
                  title="Settings"
                >
                  Settings
                </button>
                <button
                  className="btn sm"
                  onClick={() => setBackupOpen(true)}
                  title="Backup (Ctrl+B)"
                >
                  Backup
                </button>
                <button
                  className="btn sm"
                  onClick={() => handleLock("Vault locked")}
                  title="Lock (Ctrl+L)"
                >
                  Lock
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="settings-bar">
                <span className="settings-label">Auto-lock after</span>
                <div className="settings-options">
                  {IDLE_OPTIONS.map((o) => (
                    <button
                      key={o.ms}
                      className={`btn sm ${idleMs === o.ms ? "primary" : ""}`}
                      onClick={() => changeIdle(o.ms)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="shortcuts-hint">
                  Shortcuts: Ctrl+L lock · Ctrl+B backup · Ctrl+1/2/3 tabs · Esc close · Window close → tray
                </p>
              </div>
            )}

            {section === "passwords" && (
              <PasswordsPanel key={`p-${panelKey}`} onLock={() => handleLock()} />
            )}
            {section === "recovery" && (
              <RecoveryPhrasesPanel
                key={`r-${panelKey}`}
                onLock={() => handleLock()}
              />
            )}
            {section === "hardcoded" && (
              <HardcodedPanel key={`h-${panelKey}`} onLock={() => handleLock()} />
            )}
          </div>
        )}
      </main>

      <BackupModal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        onImported={() => {
          setPanelKey((k) => k + 1);
          toast("Import complete", "success");
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <footer className="footer">
        <span>Kryptix Desktop v0.1.0</span>
        <span>Tauri 2 + React + TypeScript</span>
      </footer>
    </div>
  );
}

export default App;
