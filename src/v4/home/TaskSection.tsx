import { ReactNode } from "react";

export type SectionTone = "danger" | "warning" | "info" | "success" | "neutral";

const TONE: Record<
  SectionTone,
  { band: string; text: string; bg: string; border: string }
> = {
  danger:  { band: "#dc2626", text: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
  warning: { band: "#d97706", text: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  info:    { band: "#2563eb", text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe" },
  success: { band: "#16a34a", text: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  neutral: { band: "#9a9996", text: "#4a4a4a", bg: "#fafaf9", border: "#e5e3dd" },
};

export function TaskSection({
  title,
  count,
  tone = "neutral",
  children,
  emptyLabel,
}: {
  title: string;
  count?: number;
  tone?: SectionTone;
  children: ReactNode;
  emptyLabel?: string;
  // legacy compat — accepted but unused now
  emphasized?: boolean;
}) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  const c = TONE[tone];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 10,
          borderLeft: `3px solid ${c.band}`,
          minHeight: 22,
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: c.text,
            margin: 0,
            letterSpacing: "-0.1px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {typeof count === "number" && count > 0 ? (
          <span
            className="v4-tabular"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: c.text,
              background: c.bg,
              border: `1px solid ${c.border}`,
              padding: "0 6px",
              borderRadius: 10,
              lineHeight: "16px",
            }}
          >
            {count}건
          </span>
        ) : null}
      </header>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {isEmpty ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--v4-text-tertiary)",
              padding: "12px 14px",
            }}
          >
            {emptyLabel || "항목이 없습니다."}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
