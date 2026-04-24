import type { TaskItem } from "./TaskRow";

export function UpcomingList({
  items,
  onOpen,
}: {
  items: TaskItem[];
  onOpen?: (id: string) => void;
}) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0 8px",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--v4-text-primary)",
            letterSpacing: "-0.1px",
          }}
        >
          이번 주 예정
        </span>
        <span
          className="v4-tabular"
          style={{
            fontSize: 10,
            color: "var(--v4-text-tertiary)",
            fontWeight: 400,
          }}
        >
          {items.length}건
        </span>
      </header>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "14px 12px",
              fontSize: 11.5,
              color: "var(--v4-text-tertiary)",
              textAlign: "center",
            }}
          >
            이번 주 예정이 없습니다.
          </div>
        ) : (
          items.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen?.(t.id)}
              className="v4-upcoming-row"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "7px 6px",
                background: "transparent",
                border: "none",
                borderTop: "1px solid var(--v4-border-light)",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--v4-text-primary)",
                  }}
                >
                  {t.customerName}
                </span>
                {t.time ? (
                  <span
                    className="v4-tabular"
                    style={{ fontSize: 10, color: "var(--v4-text-tertiary)" }}
                  >
                    {t.time}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--v4-text-tertiary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.tag ? <span style={{ marginRight: 6 }}>· {t.tag}</span> : null}
                {t.nextAction}
              </div>
            </button>
          ))
        )}
      </div>
      <style>{`
        .v4-upcoming-row:first-of-type {
          border-top: none;
        }
        .v4-upcoming-row:hover {
          background: var(--v4-bg-secondary);
        }
      `}</style>
    </section>
  );
}
