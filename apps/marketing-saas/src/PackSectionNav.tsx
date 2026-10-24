import "./PackSectionNav.css";
export type PackSection = "posts" | "hooks" | "plan" | "export";
export const packSections: { id: PackSection; label: string }[] = [
  { id: "posts", label: "3 Posts" },
  { id: "hooks", label: "Hooks & CTA" },
  { id: "plan", label: "7-Tage-Plan" },
  { id: "export", label: "Prüfen & exportieren" },
];
export default function PackSectionNav({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: PackSection;
  onChange: (value: PackSection) => void;
}) {
  return (
    <div
      className="pack-section-nav"
      role="tablist"
      aria-label="Inhalte des Marketing-Packs"
    >
      {packSections.map(({ id, label }, index) => (
        <button
          type="button"
          key={id}
          role="tab"
          id={`${prefix}-tab-${id}`}
          aria-selected={value === id}
          aria-controls={`${prefix}-${id}`}
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(e) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 3
                  : (index + (e.key === "ArrowRight" ? 1 : 3)) % 4;
            onChange(packSections[next].id);
            document
              .getElementById(`${prefix}-tab-${packSections[next].id}`)
              ?.focus();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
