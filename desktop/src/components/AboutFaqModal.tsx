type Props = {
  open: boolean;
  mode: "about" | "faq";
  onClose: () => void;
};

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Where is my data stored?",
    a: "Everything stays on this device. Vault data is encrypted with your master password and saved locally via the OS store. Nothing is uploaded to a cloud or to our servers — Kryptix has zero network data collection.",
  },
  {
    q: "What if I forget my master password?",
    a: "There is no recovery. The master password is never stored in plain form and cannot be reset by the app. Keep a secure offline copy of the password or use a .kryptix encrypted backup with a separate export passphrase you will remember.",
  },
  {
    q: "How does encryption work?",
    a: "Entries are encrypted with AES-256 using a key derived from your master password. Full vault backups (.kryptix) use AES-256-CBC with a stretched KDF and a MAC so tampering is detectable.",
  },
  {
    q: "How does biometric unlock work?",
    a: "After you unlock once with the master password, you can enable Windows Hello or Touch ID. The master password is then stored only in the OS biometric vault and released after a successful biometric prompt. Disable biometrics anytime in Settings.",
  },
  {
    q: "What about Linux?",
    a: "The desktop app runs on Linux with the same encrypted vault. Biometric unlock is not available on Linux (no cross-distro API); use the master password there.",
  },
  {
    q: "What file formats can I import/export?",
    a: "Export: encrypted .kryptix, plain JSON, or CSV (passwords / recovery). Import auto-detects .kryptix, JSON, and CSV. Encrypted imports ask for the export passphrase after you pick the file.",
  },
  {
    q: "What are password categories?",
    a: "Optional labels to group passwords (Work, Personal, Banking, …). Filter the list by category chips, assign a category when adding or editing an entry, and create or delete categories from the Passwords panel.",
  },
  {
    q: "Is the source code open?",
    a: "Yes — Kryptix is open source under the MIT license. Review the security model and contribute on GitHub.",
  },
];

export default function AboutFaqModal({ open, mode, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{mode === "about" ? "About Kryptix" : "FAQ"}</h2>
          <button className="btn sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {mode === "about" ? (
            <div className="about-body">
              <p className="about-lead">
                Kryptix is a local-only password and recovery-phrase vault.
                Your secrets never leave this machine unless you export them.
              </p>
              <dl className="about-meta">
                <div>
                  <dt>Version</dt>
                  <dd>0.1.0 (Desktop)</dd>
                </div>
                <div>
                  <dt>Stack</dt>
                  <dd>Tauri 2 · React · TypeScript · Rust</dd>
                </div>
                <div>
                  <dt>Encryption</dt>
                  <dd>AES-256 · Web Crypto · OS-backed store</dd>
                </div>
                <div>
                  <dt>License</dt>
                  <dd>MIT</dd>
                </div>
              </dl>
              <p className="muted">
                Built for transparency. No accounts, no telemetry, no recovery
                backdoor — by design.
              </p>
            </div>
          ) : (
            <div className="faq-list">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
