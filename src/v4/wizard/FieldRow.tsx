import { ReactNode } from "react";

export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 24,
        padding: "14px 0",
        borderBottom: "1px solid var(--v4-border-tertiary)",
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
        <label style={{ fontSize: 13, color: "var(--v4-text-secondary)", fontWeight: 400 }}>
          {label}
        </label>
        {hint ? (
          <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>{hint}</span>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", minHeight: 28 }}>{children}</div>
    </div>
  );
}
