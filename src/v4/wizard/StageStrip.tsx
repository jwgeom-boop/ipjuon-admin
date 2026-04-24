import { Check } from "lucide-react";

export interface Stage {
  label: string;
}

export function StageStrip({
  stages,
  current,
  onJump,
}: {
  stages: Stage[];
  current: number;
  onJump?: (i: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 32px",
        borderBottom: "1px solid var(--v4-border-tertiary)",
        background: "var(--v4-bg-primary)",
        overflowX: "auto",
      }}
    >
      {stages.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const color = done
          ? "var(--v4-success)"
          : active
          ? "var(--v4-text-primary)"
          : "var(--v4-text-tertiary)";
        const bg = done
          ? "var(--v4-success)"
          : active
          ? "var(--v4-text-primary)"
          : "transparent";
        const border = done || active ? "none" : "1.5px solid var(--v4-border-secondary)";

        return (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => onJump?.(i)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px 4px 4px",
                border: "none",
                background: "transparent",
                cursor: onJump ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: bg,
                  border,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: done || active ? "#fff" : "var(--v4-text-tertiary)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color,
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </button>
            {i < stages.length - 1 ? (
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 1,
                  background: done ? "var(--v4-success)" : "var(--v4-border-tertiary)",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
