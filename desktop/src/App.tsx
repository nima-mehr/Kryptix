import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  generateId,
  encryptPassword,
  decryptPassword,
  algorithmLabel,
  type PasswordEntry,
} from "@kryptix/core";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Ready");
  const [coreStatus, setCoreStatus] = useState("Not tested");

  async function testBackend() {
    try {
      const msg = await invoke<string>("greet", { name: "Kryptix" });
      setStatus(msg);
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  async function testSharedCore() {
    try {
      const id = generateId();
      const sample: PasswordEntry = {
        id,
        site: "example.com",
        username: "demo",
        password: "secret-password",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const { ciphertext, iv } = await encryptPassword(
        sample.password,
        "aes256",
        "test-master-key"
      );
      const plain = await decryptPassword(
        ciphertext,
        "aes256",
        "test-master-key",
        iv
      );

      if (plain !== sample.password) {
        setCoreStatus("FAIL: decrypt mismatch");
        return;
      }

      setCoreStatus(
        `OK — id=${id.slice(0, 8)}… | ${algorithmLabel("aes256")} round-trip works`
      );
    } catch (e) {
      setCoreStatus(`Error: ${String(e)}`);
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
          <h2>Shared core connected</h2>
          <p>
            Desktop now imports types and crypto from{" "}
            <code>@kryptix/core</code>. Run the tests below to verify the
            Rust shell and the shared TypeScript core.
          </p>

          <div className="actions">
            <button className="btn primary" onClick={testBackend}>
              Test Rust backend
            </button>
            <button className="btn" onClick={testSharedCore}>
              Test shared core
            </button>
          </div>

          <p className="status">Rust: {status}</p>
          <p className="status">Core: {coreStatus}</p>
        </section>

        <section className="card muted">
          <h3>Next up</h3>
          <ul>
            <li>Desktop secure storage (OS keychain)</li>
            <li>Login + unlock flow</li>
            <li>Passwords / Recovery / Hardcoded panels</li>
            <li>.kryptix import / export</li>
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
