import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Ready");

  async function testBackend() {
    try {
      const msg = await invoke<string>("greet", { name: "Kryptix" });
      setStatus(msg);
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo-row">
          <div className="sphere" aria-hidden />
          <h1 className="title">KRYPTIX</h1>
        </div>
        <p className="subtitle">Secure vault • Desktop</p>
      </header>

      <main className="main">
        <section className="card">
          <h2>Desktop scaffold is ready</h2>
          <p>
            This is the Tauri + React foundation for the Kryptix desktop app.
            Next steps: shared encryption core, secure storage, and vault UI.
          </p>

          <div className="actions">
            <button className="btn primary" onClick={testBackend}>
              Test Rust backend
            </button>
          </div>

          <p className="status">{status}</p>
        </section>

        <section className="card muted">
          <h3>Planned structure</h3>
          <ul>
            <li>Shared pure-TS crypto &amp; .kryptix format</li>
            <li>OS keychain / secure storage via Tauri</li>
            <li>Desktop-optimized Passwords / Recovery / Hardcoded panels</li>
            <li>Import / Export (.kryptix, JSON, CSV)</li>
            <li>Auto-lock, tray (optional), biometrics where available</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span>Kryptix Desktop v0.1.0</span>
        <span>Tauri 2 + React + TypeScript</span>
      </footer>
    </div>
  );
}

export default App;
