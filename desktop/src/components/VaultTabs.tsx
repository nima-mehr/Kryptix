export type VaultSection = "passwords" | "recovery" | "hardcoded";

type Props = {
  active: VaultSection;
  onChange: (section: VaultSection) => void;
};

const TABS: { id: VaultSection; label: string; danger?: boolean }[] = [
  { id: "passwords", label: "Passwords" },
  { id: "recovery", label: "Recovery phrases" },
  { id: "hardcoded", label: "Hardcoded", danger: true },
];

export default function VaultTabs({ active, onChange }: Props) {
  return (
    <nav className="vault-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`vault-tab ${active === tab.id ? "active" : ""} ${
            tab.danger ? "danger-tab" : ""
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
