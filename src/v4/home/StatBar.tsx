import { ReactNode } from "react";

interface Stat {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "info" | "success" | "warning";
  hint?: string;
  icon?: ReactNode;
}

const TONE_COLOR: Record<NonNullable<Stat["tone"]>, string> = {
  default: "var(--v4-text-primary)",
  danger: "var(--v4-danger)",
  info: "var(--v4-info)",
  success: "var(--v4-success)",
  warning: "var(--v4-warning)",
};
const TONE_BG: Record<NonNullable<Stat["tone"]>, string> = {
  default: "transparent",
  danger: "var(--v4-bg-danger)",
  info: "var(--v4-bg-info)",
  success: "var(--v4-bg-success)",
  warning: "var(--v4-bg-warning)",
};

export function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: "var(--v4-radius-md)",
        background: "var(--v4-bg-primary)",
        overflow: "hidden",
      }}
    >
      {stats.map((s, i) => {
        const tone = s.tone ?? "default";
        const accent = TONE_COLOR[tone];
        return (
          <div
            key={s.label}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "14px 20px",
              borderRight:
                i < stats.length - 1 ? "1px solid var(--v4-border-tertiary)" : "none",
              background: tone !== "default" ? TONE_BG[tone] : "transparent",
            }}
          >
            {tone !== "default" ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: accent,
                }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                className="v4-tabular"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: accent,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </span>
              {s.icon ? (
                <span style={{ color: accent, display: "inline-flex" }}>{s.icon}</span>
              ) : null}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--v4-text-tertiary)",
                marginTop: 4,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{s.label}</span>
              {s.hint ? (
                <span
                  className="v4-tabular"
                  style={{ color: "var(--v4-text-tertiary)", opacity: 0.8 }}
                >
                  {s.hint}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
