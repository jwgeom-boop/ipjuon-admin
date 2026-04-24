import { Check } from "lucide-react";

export type TimelineStage =
  | "inbox"
  | "reservation"
  | "signing"
  | "execution"
  | "completed";

const STAGES: { key: TimelineStage; label: string }[] = [
  { key: "inbox", label: "상담" },
  { key: "reservation", label: "자서예약" },
  { key: "signing", label: "자서" },
  { key: "execution", label: "실행" },
  { key: "completed", label: "완료" },
];

const ORDER: Record<TimelineStage, number> = {
  inbox: 0,
  reservation: 1,
  signing: 2,
  execution: 3,
  completed: 4,
};

interface Props {
  currentStage: TimelineStage;
  viewStage: TimelineStage;
  onJump: (stage: TimelineStage) => void;
}

export function StageTimeline({ currentStage, viewStage, onJump }: Props) {
  const currentIdx = ORDER[currentStage];
  return (
    <div
      className="v4-no-print"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 16px",
        borderBottom: "1px solid var(--v4-border-tertiary)",
        background: "var(--v4-bg-primary)",
        flexShrink: 0,
      }}
    >
      {STAGES.map((s, i) => {
        const idx = ORDER[s.key];
        const reached = idx <= currentIdx;
        const isActive = s.key === viewStage;
        const isCurrent = s.key === currentStage;
        const clickable = reached;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump(s.key)}
              title={
                clickable
                  ? isCurrent
                    ? `${s.label} (현재 단계)`
                    : `${s.label} 단계 보기`
                  : `${s.label} 단계 미도달`
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                lineHeight: 1.2,
                border: "1px solid",
                borderColor: isActive
                  ? "var(--v4-accent, #2563eb)"
                  : reached
                  ? "var(--v4-border-secondary)"
                  : "var(--v4-border-tertiary)",
                background: isActive
                  ? "var(--v4-accent, #2563eb)"
                  : reached
                  ? "var(--v4-bg-secondary)"
                  : "transparent",
                color: isActive
                  ? "#fff"
                  : reached
                  ? "var(--v4-text-primary)"
                  : "var(--v4-text-tertiary)",
                borderRadius: 999,
                cursor: clickable ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
                transition: "background 80ms, color 80ms, border-color 80ms",
              }}
            >
              {idx < currentIdx && <Check size={11} strokeWidth={2.5} />}
              {s.label}
              {isCurrent && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    opacity: isActive ? 0.85 : 0.6,
                  }}
                >
                  · 현재
                </span>
              )}
            </button>
            {i < STAGES.length - 1 && (
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 1,
                  background: "var(--v4-border-tertiary)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
