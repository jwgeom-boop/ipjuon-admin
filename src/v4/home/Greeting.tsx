import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Building2 } from "lucide-react";

export function Greeting({
  bankName,
  complex,
  progress,
}: {
  bankName: string;
  complex?: string;
  progress?: { done: number; total: number };
}) {
  const today = new Date();
  const dateLabel = format(today, "M월 d일 EEEE", { locale: ko });
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.4px",
          color: "var(--v4-text-primary)",
          margin: 0,
          lineHeight: 1.25,
        }}
      >
        안녕하세요,{" "}
        <span style={{ color: "var(--v4-info)" }}>{bankName}</span>
      </h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          fontSize: 12.5,
          color: "var(--v4-text-tertiary)",
          flexWrap: "wrap",
        }}
      >
        <span className="v4-tabular">{dateLabel}</span>
        {complex ? (
          <>
            <span style={{ opacity: 0.45 }}>·</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "var(--v4-text-secondary)",
                background: "var(--v4-bg-secondary)",
                padding: "2px 8px",
                borderRadius: "var(--v4-radius-sm)",
              }}
            >
              <Building2 size={12} strokeWidth={1.8} />
              {complex}
            </span>
          </>
        ) : null}
        {progress ? (
          <>
            <span style={{ opacity: 0.45 }}>·</span>
            <span
              className="v4-tabular"
              style={{ color: "var(--v4-text-secondary)" }}
            >
              오늘 {progress.done}/{progress.total} 완료
            </span>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 80,
                height: 4,
                borderRadius: 2,
                background: "var(--v4-bg-tertiary)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--v4-success)",
                  transition: "width 200ms",
                }}
              />
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
