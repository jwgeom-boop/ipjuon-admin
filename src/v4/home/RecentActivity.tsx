import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { SidePanel } from "./SidePanel";

interface ActivityItem {
  id: string;
  time: string;
  who: string;
  what: string;
}

const COLLAPSED_COUNT = 2;

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > COLLAPSED_COUNT;
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);

  return (
    <SidePanel
      title="최근 활동"
      tone="neutral"
      icon={<Activity size={13} strokeWidth={2} />}
      meta={items.length > 0 ? `${items.length}건` : undefined}
      tinted
    >
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--v4-text-tertiary)", padding: "4px 0" }}>
          최근 활동이 없습니다.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visible.map((it, idx) => (
              <div
                key={it.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "8px 44px 1fr",
                  gap: 10,
                  padding: "8px 0",
                  borderTop: idx === 0 ? "none" : "1px dashed var(--v4-border-tertiary)",
                  fontSize: 12,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--v4-text-tertiary)",
                    marginTop: 6,
                  }}
                />
                <span
                  className="v4-tabular"
                  style={{ color: "var(--v4-text-tertiary)", fontSize: 11 }}
                >
                  {it.time}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <div style={{ color: "var(--v4-text-primary)", fontWeight: 500 }}>
                    {it.who}
                  </div>
                  <div style={{ color: "var(--v4-text-secondary)", fontSize: 11.5 }}>
                    {it.what}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{
                marginTop: 6,
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "5px 8px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--v4-text-tertiary)",
                background: "transparent",
                border: "1px dashed var(--v4-border-tertiary)",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} strokeWidth={1.8} /> 접기
                </>
              ) : (
                <>
                  <ChevronDown size={12} strokeWidth={1.8} /> 더보기 ({items.length - COLLAPSED_COUNT})
                </>
              )}
            </button>
          ) : null}
        </>
      )}
    </SidePanel>
  );
}
