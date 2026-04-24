import { ReactNode } from "react";

export function SubtotalBox({
  label,
  value,
  tone = "neutral",
  children,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
  children?: ReactNode;
}) {
  const bg =
    tone === "danger" ? "var(--v4-bg-danger)" : tone === "success" ? "var(--v4-bg-success)" : "var(--v4-bg-secondary)";
  const color =
    tone === "danger" ? "var(--v4-danger)" : tone === "success" ? "var(--v4-success)" : "var(--v4-text-primary)";

  return (
    <div
      style={{
        marginTop: 24,
        padding: 18,
        background: bg,
        borderRadius: "var(--v4-radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, color: "var(--v4-text-secondary)", fontWeight: 500 }}>{label}</span>
        <span
          className="v4-tabular"
          style={{ fontSize: 20, fontWeight: 600, color, letterSpacing: "-0.3px" }}
        >
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}
