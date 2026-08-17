import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import {
  vaultExists,
  createVault,
  unlockVault,
  lockVault,
  isUnlocked,
  getSessionMaster,
} from "./lib/storage";
import {
  getBiometryInfo,
  canUnlockWithBiometrics,
  enableBiometrics,
  disableBiometrics,
  unlockWithBiometrics,
  isBiometricPrefEnabled,
  type BiometryInfo,
} from "./lib/biometrics";
import VaultTabs, { type VaultSection } from "./components/VaultTabs";
import PasswordsPanel from "./components/PasswordsPanel";
import RecoveryPhrasesPanel from "./components/RecoveryPhrasesPanel";
import HardcodedPanel from "./components/HardcodedPanel";
import ExportModal from "./components/ExportModal";
import ImportModal from "./components/ImportModal";
import AboutFaqModal from "./components/AboutFaqModal";
import ToastStack, { type ToastMessage, type ToastKind } from "./components/Toast";
import KryptixSphereLogo from "./components/KryptixSphereLogo";
import {
  useIdleLock,
  IDLE_OPTIONS,
  loadIdleTimeout,
  saveIdleTimeout,
} from "./hooks/useIdleLock";
import "./App.css";

type Mode = "loading" | "create" | "unlock" | "unlocked";

const LOGIN_SIZE = { width: 460, height: 500 };
const VAULT_SIZE = { width: 920, height: 640 };
const LOGIN_MIN = { width: 420, height: 420 };
const VAULT_MIN = { width: 720, height: 520 };

async function applyWindowSize(forVault: boolean) {
  try {
    const win = getCurrentWindow();
    const size = forVault ? VAULT_SIZE : LOGIN_SIZE;
    const min = forVault ? VAULT_MIN : LOGIN_MIN;
    await win.setMinSize(new LogicalSize(min.width, min.height));
    await win.setSize(new LogicalSize(size.width, size.height));
    await win.center();
  } catch (err) {
    console.warn("[kryptix] applyWindowSize failed:", err);
  }
}

function App() {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [section, setSection] = useState<VaultSection>("passwords");
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [idleMs, setIdleMs] = useState(loadIdleTimeout);
  const [showSettings, setShowSettings] = useState(false);
  const [infoMode, setInfoMode] = useState<"about" | "faq" | null>(null);
  const [bioInfo, setBioInfo] = useState<BiometryInfo | null>(null);
  const [bioEnabled, setBioEnabled] = useState(isBiometricPrefEnabled);
  const [bioCanUnlock, setBioCanUnlock] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
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
    let cancelled = false;
    (async () => {
      const info = await getBiometryInfo();
      if (cancelled) return;
      setBioInfo(info);
      const can = await canUnlockWithBiometrics();
      if (!cancelled) {
        setBioCanUnlock(can);
        setBioEnabled(isBiometricPrefEnabled());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    vaultExists()
      .then((exists) => setMode(exists ? "unlock" : "create"))
      .catch((e) => {
        setError(String(e));
        setMode("create");
      });
  }, []);

  useEffect(() => {
    if (mode === "loading") return;
    void applyWindowSize(mode === "unlocked");
  }, [mode]);

  function handleLock(reason?: string) {
    lockVault();
    setMode("unlock");
    setSection("passwords");
    setExportOpen(false);
    setImportOpen(false);
    setShowSettings(false);
    setInfoMode(null);
    if (reason) toast(reason, "info");
  }

  useIdleLock(mode === "unlocked", idleMs, () => {
    handleLock("Locked due to inactivity");
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        if (exportOpen) {
          setExportOpen(false);
          e.preventDefault();
        } else if (importOpen) {
          setImportOpen(false);
          e.preventDefault();
        } else if (infoMode) {
          setInfoMode(null);
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
          setExportOpen(true);
        }
        return;
      }
      if (e.key === "i" || e.key === "I") {
        if (mode === "unlocked") {
          e.preventDefault();
          setImportOpen(true);
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
  }, [mode, exportOpen, importOpen, showSettings, infoMode]);

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

  async function handleBiometricUnlock() {
    setError("");
    setBioBusy(true);
    try {
      const master = await unlockWithBiometrics();
      await unlockVault(master);
      setMode("unlocked");
      toast("Unlocked with " + (bioInfo?.label || "biometrics"), "success");
    } catch (e) {
      const msg = String(e);
      if (!/cancel/i.test(msg)) {
        setError(msg);
        toast(msg, "error");
      }
    } finally {
      setBioBusy(false);
    }
  }

  async function handleToggleBiometrics() {
    setError("");
    setBioBusy(true);
    try {
      if (bioEnabled) {
        await disableBiometrics();
        setBioEnabled(false);
        setBioCanUnlock(false);
        toast("Biometric unlock disabled", "info");
      } else {
        const master = getSessionMaster();
        if (!master) throw new Error("Unlock with your password first");
        await enableBiometrics(master);
        setBioEnabled(true);
        setBioCanUnlock(true);
        toast((bioInfo?.label || "Biometric") + " unlock enabled", "success");
      }
    } catch (e) {
      const msg = String(e);
      if (!/cancel/i.test(msg)) toast(msg, "error");
    } finally {
      setBioBusy(false);
    }
  }

  function changeIdle(ms: number) {
    setIdleMs(ms);
    saveIdleTimeout(ms);
    const label = IDLE_OPTIONS.find((o) => o.ms === ms)?.label ?? String(ms) + "ms";
    toast("Auto-lock: " + label, "success");
  }

  if (mode === "loading") {
    return (
      <div className="app app-login">
        <main className="main single login-main">
          <section className="card login-card">
            <p>Loading...</p>
          </section>
        </main>
      </div>
    );
  }

  const isLogin = mode === "create" || mode === "unlock";
  const mainClass = mode === "unlocked" ? "main single" : "main single login-main";
  const statusText =
    (isUnlocked() ? " • Unlocked" : " • Locked") +
    (mode === "unlocked" && idleMs > 0
      ? " • Auto-lock " + Math.round(idleMs / 60000) + "m"
      : "");

  return (
    <div className={isLogin ? "app app-login" : "app"}>
      <header className="header">
        <div className="logo-row">
          <KryptixSphereLogo size={isLogin ? 28 : 36} />
          <h1 className="title">KRYPTIX</h1>
        </div>
        <p className="subtitle">
          Secure vault • Desktop
          {statusText}
        </p>
      </header>

      <main className={mainClass}>
        {isLogin && (
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
                    if (mode === "create") handleCreate();
                    else handleUnlock();
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
                {mode === "unlock" && bioCanUnlock && (
                  <button
                    className="btn"
                    disabled={bioBusy}
                    onClick={handleBiometricUnlock}
                    title={bioInfo?.label || "Biometrics"}
                  >
                    {bioBusy
                      ? "Waiting…"
                      : "Unlock with " + (bioInfo?.label || "biometrics")}
                  </button>
                )}
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
                  onClick={() => setImportOpen(true)}
                  title="Import (Ctrl+I)"
                >
                  Import
                </button>
                <button
                  className="btn sm"
                  onClick={() => setExportOpen(true)}
                  title="Export (Ctrl+B)"
                >
                  Export
                </button>
                <button
                  className="btn sm danger"
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
                      className={idleMs === o.ms ? "btn sm primary" : "btn sm"}
                      onClick={() => changeIdle(o.ms)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                <span className="settings-label">Biometric unlock</span>
                <div className="settings-options">
                  {bioInfo?.available ? (
                    <button
                      className={bioEnabled ? "btn sm primary" : "btn sm"}
                      disabled={bioBusy}
                      onClick={handleToggleBiometrics}
                    >
                      {bioBusy
                        ? "…"
                        : bioEnabled
                          ? (bioInfo.label || "Biometrics") + " on"
                          : "Enable " + (bioInfo.label || "biometrics")}
                    </button>
                  ) : (
                    <span className="muted settings-hint">
                      Not available on this device
                      {bioInfo?.error ? " — " + bioInfo.error : ""}
                    </span>
                  )}
                </div>

                <span className="settings-label">Help</span>
                <div className="settings-options">
                  <button className="btn sm" type="button" onClick={() => setInfoMode("faq")}>
                    FAQ
                  </button>
                  <button className="btn sm" type="button" onClick={() => setInfoMode("about")}>
                    About
                  </button>
                </div>

                <p className="shortcuts-hint">
                  Shortcuts: Ctrl+L lock · Ctrl+B export · Ctrl+I import ·
                  Ctrl+1/2/3 tabs · Esc close · Window close goes to tray
                </p>
              </div>
            )}

            {section === "passwords" && <PasswordsPanel key={"p-" + panelKey} />}
            {section === "recovery" && <RecoveryPhrasesPanel key={"r-" + panelKey} />}
            {section === "hardcoded" && <HardcodedPanel key={"h-" + panelKey} />}
          </div>
        )}
      </main>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onDone={(msg) => toast(msg, "success")}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(msg) => {
          setPanelKey((k) => k + 1);
          toast(msg || "Import complete", "success");
        }}
      />

      <AboutFaqModal
        open={infoMode !== null}
        mode={infoMode === "about" ? "about" : "faq"}
        onClose={() => setInfoMode(null)}
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
