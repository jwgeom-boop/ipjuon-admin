import { Wallet } from "lucide-react";
import { SidePanel } from "./SidePanel";

export function CapacityCard({
  approvalNo,
  usedBillion,
  totalBillion,
  monthly,
  defaultCollapsed,
}: {
  approvalNo: string;
  usedBillion: number;
  totalBillion: number;
  monthly: { month: string; count: number; billion: number }[];
  defaultCollapsed?: boolean;
}) {
  const pct = Math.min(100, Math.round((usedBillion / totalBillion) * 100));
  const barColor = pct > 80 ? "var(--v4-warning)" : "var(--v4-success)";
  const tone = pct > 80 ? "warning" : "success";

  return (
    <SidePanel
      title="현장 한도"
      tone={tone}
      icon={<Wallet size={13} strokeWidth={2} />}
      meta={`${pct}% 소진`}
      defaultCollapsed={defaultCollapsed}
      tinted
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span
            className="v4-tabular"
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--v4-text-primary)",
              letterSpacing: "-0.3px",
            }}
          >
            {usedBillion.toFixed(1)}
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--v4-text-tertiary)", marginLeft: 2 }}>
              억
            </span>
          </span>
          <span className="v4-tabular" style={{ fontSize: 12, color: "var(--v4-text-tertiary)" }}>
            / {totalBillion}억
          </span>
        </div>

        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--v4-bg-tertiary)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: barColor,
              transition: "width 300ms",
            }}
          />
        </div>

        <div
          className="v4-tabular"
          style={{
            fontSize: 11,
            color: "var(--v4-text-tertiary)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{pct}% 소진</span>
          <span>잔여 {(totalBillion - usedBillion).toFixed(1)}억</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--v4-border-tertiary)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--v4-text-tertiary)",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontWeight: 600,
          }}
        >
          월별 실행예정
        </div>
        {monthly.map((m) => {
          const barPct = Math.min(100, (m.billion / 20) * 100);
          return (
            <div
              key={m.month}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr auto",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
                padding: "4px 0",
              }}
            >
              <span style={{ color: "var(--v4-text-secondary)", fontWeight: 500 }}>{m.month}</span>
              <span
                style={{
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
                    width: `${barPct}%`,
                    background: "var(--v4-info)",
                  }}
                />
              </span>
              <span
                className="v4-tabular"
                style={{ color: "var(--v4-text-primary)", fontSize: 11.5 }}
              >
                {m.count}건 · {m.billion.toFixed(2)}억
              </span>
            </div>
          );
        })}
      </div>
    </SidePanel>
  );
}
