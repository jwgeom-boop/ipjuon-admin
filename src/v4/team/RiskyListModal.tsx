import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";

type Props = {
  items: TaskItem[];
  onClose: () => void;
  onSelectTask: (task: TaskItem) => void;
  riskLabelOf: (task: TaskItem) => string;
  renderAssignee: (task: TaskItem) => React.ReactNode;
};

export function RiskyListModal({
  items,
  onClose,
  onSelectTask,
  riskLabelOf,
  renderAssignee,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "85vh",
          background: "var(--v4-bg-primary)",
          border: "1px solid var(--v4-border-secondary)",
          borderRadius: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--v4-border-light)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                width: 22,
                height: 22,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 5,
                background: "var(--v4-bg-danger)",
                color: "var(--v4-danger)",
              }}
            >
              <AlertTriangle size={13} strokeWidth={2} />
            </span>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--v4-text-primary)" }}>
              위험건 <span className="v4-tabular" style={{ color: "var(--v4-text-tertiary)", fontWeight: 500 }}>({items.length})</span>
            </h2>
            <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)", marginLeft: 4 }}>
              지연 · 긴급(critical) · 자서 D-1 이하
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "none",
              background: "transparent",
              color: "var(--v4-text-tertiary)",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        <div style={{ overflowY: "auto", padding: "4px 0" }}>
          {items.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--v4-text-tertiary)",
                padding: "30px 12px",
                textAlign: "center",
              }}
            >
              위험 건 없음
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((t) => (
                <li
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    borderTop: "1px solid var(--v4-border-light)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v4-bg-tertiary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 6,
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t.customerName}</span>
                    <span
                      className="v4-tabular"
                      style={{ fontSize: 11, fontWeight: 600, color: "var(--v4-danger)" }}
                    >
                      {riskLabelOf(t)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--v4-text-tertiary)",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {renderAssignee(t)}
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {t.addressLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--v4-text-secondary)",
                      marginTop: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.nextAction}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
