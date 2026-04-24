import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Search, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TaskItem } from "../home/TaskRow";
import ExecutionWizard from "../pages/ExecutionWizard";
import { getExecutionFixture } from "../wizard/executionFixtures";
import { diffDaysFromToday, formatDday, ddayTone, ddaySortKey } from "../lib/dday";
import { ModalShell, ModalHeader, modalActionButtonStyle } from "../shared/ModalShell";

type Props = {
  items: TaskItem[];
  complex: string;
  onClose: () => void;
};

export function RepaymentEmbedModal({ items, complex, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const enriched = useMemo(() => {
    return items
      .map((t) => {
        const fx = getExecutionFixture(t.id);
        const diff = diffDaysFromToday(fx.executionDate);
        return { task: t, diff, label: formatDday(diff) };
      })
      .sort((a, b) => ddaySortKey(a.diff) - ddaySortKey(b.diff));
  }, [items]);

  const [selectedId, setSelectedId] = useState<string | null>(
    enriched[0]?.task.id ?? null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      ({ task: t }) =>
        t.customerName.toLowerCase().includes(q) ||
        (t.addressLabel ?? "").toLowerCase().includes(q) ||
        (t.assignee ?? "").toLowerCase().includes(q),
    );
  }, [enriched, query]);

  return createPortal(
    <ModalShell
      size="embed"
      ariaLabel="상환조회"
      onClose={onClose}
      className="v4-repayment-modal"
      shellClassName="v4-repayment-modal-shell"
    >
      <style>{`
        @media print {
          /* hide everything outside the modal so only the wizard prints */
          body > *:not(.v4-repayment-modal) { display: none !important; }
          .v4-repayment-modal {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            display: block !important;
            inset: auto !important;
            height: auto !important;
          }
          .v4-repayment-modal-shell {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .v4-repayment-modal-body {
            display: block !important;
            grid-template-columns: 1fr !important;
            min-height: 0 !important;
          }
          .v4-repayment-modal-pane {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
          }
          /* embedded wizard outer must let content flow across pages */
          .v4-repayment-modal .v4-execution-wizard {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            background: #fff !important;
          }
          .v4-no-print { display: none !important; }
        }
      `}</style>
        <ModalHeader
          className="v4-no-print"
          title={`상환조회 — ${complex}`}
          badge={`${items.length}건`}
          onClose={onClose}
          actions={
            selectedId ? (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="A4 인쇄 / PDF로 저장 (Ctrl+P)"
                  style={modalActionButtonStyle()}
                >
                  <Printer size={13} strokeWidth={1.8} />
                  인쇄·PDF
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/v4/wizard/execution/${selectedId}`)}
                  style={modalActionButtonStyle()}
                >
                  <ExternalLink size={13} strokeWidth={1.8} />
                  위저드 페이지 열기
                </button>
              </>
            ) : null
          }
        />

        {/* Body — split */}
        <div
          className="v4-repayment-modal-body"
          style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "300px 1fr" }}
        >
          {/* Left: case list */}
          <aside
            className="v4-no-print"
            style={{
              borderRight: "1px solid var(--v4-border-tertiary)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "var(--v4-bg-secondary)",
            }}
          >
            <div style={{ padding: "10px 12px", flexShrink: 0 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: "var(--v4-bg-primary)",
                  border: "1px solid var(--v4-border-tertiary)",
                  borderRadius: 6,
                  fontSize: 12.5,
                  color: "var(--v4-text-secondary)",
                }}
              >
                <Search size={13} strokeWidth={1.8} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="고객·주소·담당자 검색"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    color: "var(--v4-text-primary)",
                  }}
                />
              </label>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "var(--v4-text-tertiary)",
                    fontSize: 12.5,
                  }}
                >
                  해당 항목 없음
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {filtered.map(({ task: t, diff, label }) => {
                    const active = t.id === selectedId;
                    const tone = ddayTone(diff);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(t.id)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            columnGap: 8,
                            alignItems: "center",
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            background: active ? "var(--v4-bg-info)" : "transparent",
                            border: "none",
                            borderLeft: active
                              ? "3px solid var(--v4-text-info)"
                              : "3px solid transparent",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                          onMouseEnter={(e) => {
                            if (!active)
                              e.currentTarget.style.background = "var(--v4-bg-tertiary)";
                          }}
                          onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: "var(--v4-text-primary)",
                                letterSpacing: "-0.2px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.customerName}
                              {t.assignee ? (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 11.5,
                                    fontWeight: 500,
                                    color: "var(--v4-text-tertiary)",
                                  }}
                                >
                                  · {t.assignee}
                                </span>
                              ) : null}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--v4-text-tertiary)",
                                marginTop: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.addressLabel}
                            </div>
                          </div>
                          <span
                            className="v4-tabular"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: tone.bg,
                              color: tone.color,
                              letterSpacing: 0.3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Right: embedded wizard */}
          <div
            className="v4-repayment-modal-pane"
            style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            {selectedId ? (
              <ExecutionWizard
                key={selectedId}
                idProp={selectedId}
                embedded
                onComplete={onClose}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--v4-text-tertiary)",
                  fontSize: 13,
                }}
              >
                좌측에서 항목을 선택하세요
              </div>
            )}
          </div>
        </div>
    </ModalShell>,
    document.body,
  );
}
