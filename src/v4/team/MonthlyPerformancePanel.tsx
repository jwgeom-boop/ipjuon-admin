import { useMemo, useState } from "react";
import { BarChart3, ChevronRight, Building2 } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";

const ASSUMED_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function parseMonth(s?: string): number | null {
  if (!s) return null;
  const iso = s.match(/^\d{4}-(\d{2})-\d{2}$/);
  if (iso) {
    const n = Number(iso[1]);
    return n >= 1 && n <= 12 ? n : null;
  }
  const m = s.match(/(\d+)\s*월/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 12 ? n : null;
}

function isExecuted(t: TaskItem): boolean {
  if (t.fundsStatus === "settled") return true;
  const exec = t.checkpoints?.find((c) => c.label === "실행");
  return !!exec?.done;
}

function fmtKrw(n: number): string {
  if (!n) return "—";
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.round((n - eok * 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
  }
  return `${Math.round(n / 10_000).toLocaleString("ko-KR")}만`;
}

interface MonthRow {
  month: number;
  count: number;
  plannedAmount: number;
  executedAmount: number;
  executedCount: number;
  rate: number;
}

interface ComplexRow {
  complex: string;
  count: number;
  plannedAmount: number;
}

function complexOf(label?: string): string {
  if (!label) return "";
  const parts = label.split(/\s*·\s*/);
  return parts[1]?.trim() ?? "";
}

function aggregateByComplex(items: TaskItem[]): ComplexRow[] {
  const map = new Map<string, ComplexRow>();
  items.forEach((t) => {
    const c = complexOf(t.addressLabel);
    if (!c) return;
    const amount = t.loanAmount ?? 0;
    const cur = map.get(c) ?? { complex: c, count: 0, plannedAmount: 0 };
    cur.count += 1;
    cur.plannedAmount += amount;
    map.set(c, cur);
  });
  return Array.from(map.values()).sort(
    (a, b) => b.plannedAmount - a.plannedAmount || b.count - a.count,
  );
}

function aggregate(items: TaskItem[]): MonthRow[] {
  const map = new Map<number, MonthRow>();
  items.forEach((t) => {
    const m = parseMonth(t.executionDate);
    if (m == null) return;
    const amount = t.loanAmount ?? 0;
    const executed = isExecuted(t);
    const cur =
      map.get(m) ??
      {
        month: m,
        count: 0,
        plannedAmount: 0,
        executedAmount: 0,
        executedCount: 0,
        rate: 0,
      };
    cur.count += 1;
    cur.plannedAmount += amount;
    if (executed) {
      cur.executedAmount += amount;
      cur.executedCount += 1;
    }
    map.set(m, cur);
  });
  const rows = Array.from(map.values()).sort((a, b) => a.month - b.month);
  rows.forEach((r) => {
    r.rate = r.plannedAmount > 0 ? r.executedAmount / r.plannedAmount : 0;
  });
  return rows;
}

type Props = {
  tasks: TaskItem[];
  onOpenDetail?: () => void;
  // fill: 부모 flex/grid 셀 높이를 채우고 본문이 넘치면 내부 스크롤.
  fill?: boolean;
};

type TabKey = "month" | "complex";

export function MonthlyPerformancePanel({ tasks, onOpenDetail, fill }: Props) {
  const [tab, setTab] = useState<TabKey>("month");
  const rows = useMemo(() => aggregate(tasks), [tasks]);
  const complexRows = useMemo(() => aggregateByComplex(tasks), [tasks]);
  const maxPlanned = useMemo(
    () => Math.max(1, ...rows.map((r) => r.plannedAmount)),
    [rows],
  );
  const maxComplexPlanned = useMemo(
    () => Math.max(1, ...complexRows.map((r) => r.plannedAmount)),
    [complexRows],
  );
  const totals = useMemo(
    () => ({
      count: rows.reduce((s, r) => s + r.count, 0),
      planned: rows.reduce((s, r) => s + r.plannedAmount, 0),
      executed: rows.reduce((s, r) => s + r.executedAmount, 0),
    }),
    [rows],
  );
  const complexTotals = useMemo(
    () => ({
      count: complexRows.reduce((s, r) => s + r.count, 0),
      planned: complexRows.reduce((s, r) => s + r.plannedAmount, 0),
      complexes: complexRows.length,
    }),
    [complexRows],
  );
  const totalRate = totals.planned > 0 ? totals.executed / totals.planned : 0;

  return (
    <section
      style={{
        background: "var(--v4-bg-secondary)",
        border: "1px solid var(--v4-border-light)",
        borderRadius: 8,
        padding: 14,
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : {}),
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <TabButton
          active={tab === "month"}
          icon={<BarChart3 size={12} strokeWidth={2} />}
          onClick={() => setTab("month")}
        >
          월별 실적
        </TabButton>
        <TabButton
          active={tab === "complex"}
          icon={<Building2 size={12} strokeWidth={2} />}
          onClick={() => setTab("complex")}
        >
          총 대출한도
        </TabButton>
        <span
          className="v4-tabular"
          style={{ fontSize: 12, color: "var(--v4-text-tertiary)", marginLeft: 4 }}
        >
          {tab === "month"
            ? `${ASSUMED_YEAR}년`
            : `${complexTotals.complexes}개 단지`}
        </span>
        {onOpenDetail ? (
          <button
            type="button"
            onClick={onOpenDetail}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              fontSize: 11.5,
              color: "var(--v4-text-info)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            전체 보기
            <ChevronRight size={12} strokeWidth={2} />
          </button>
        ) : null}
      </header>

      {tab === "complex" ? (
        complexRows.length === 0 ? (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--v4-text-tertiary)",
              padding: "16px 4px",
              textAlign: "center",
            }}
          >
            집계할 단지 데이터가 없습니다.
          </div>
        ) : (
          <>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                ...(fill ? { flex: 1, minHeight: 0, overflowY: "auto" } : {}),
              }}
            >
              {complexRows.map((c) => {
                const pct = (c.plannedAmount / maxComplexPlanned) * 100;
                return (
                  <li
                    key={c.complex}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr)",
                      padding: "10px 2px",
                      borderTop: "1px solid var(--v4-border-light)",
                    }}
                    title={`${c.complex} · ${c.count}건 · ${fmtKrw(c.plannedAmount)}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--v4-text-primary)",
                          letterSpacing: "-0.2px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                        }}
                      >
                        {c.complex}
                        <span
                          className="v4-tabular"
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--v4-text-tertiary)",
                          }}
                        >
                          {c.count}건
                        </span>
                      </span>
                      <span
                        className="v4-tabular"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--v4-text-info)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtKrw(c.plannedAmount)}
                      </span>
                    </div>
                    <div
                      style={{
                        position: "relative",
                        height: 8,
                        background: "var(--v4-bg-info)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${Math.max(0, Math.min(100, pct))}%`,
                          background: "var(--v4-info)",
                          borderRadius: 4,
                          transition: "width 200ms ease",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid var(--v4-border-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--v4-text-secondary)",
                flexShrink: 0,
              }}
            >
              <span>
                합계{" "}
                <strong style={{ color: "var(--v4-text-primary)" }}>
                  {complexTotals.count}건
                </strong>
              </span>
              <span className="v4-tabular">
                <strong style={{ color: "var(--v4-text-primary)" }}>
                  {fmtKrw(complexTotals.planned)}
                </strong>
              </span>
            </div>
          </>
        )
      ) : rows.length === 0 ? (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--v4-text-tertiary)",
            padding: "16px 4px",
            textAlign: "center",
          }}
        >
          집계할 실행 데이터가 없습니다.
        </div>
      ) : (
        <>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              ...(fill ? { flex: 1, minHeight: 0, overflowY: "auto" } : {}),
            }}
          >
            {rows.map((r) => {
              const plannedPct = (r.plannedAmount / maxPlanned) * 100;
              const executedPct = (r.executedAmount / maxPlanned) * 100;
              const isCurrent = r.month === CURRENT_MONTH;
              const rateColor =
                r.rate >= 0.8
                  ? "#1E7B37"
                  : r.rate >= 0.5
                    ? "var(--v4-text-info)"
                    : "var(--v4-text-tertiary)";
              return (
                <li
                  key={r.month}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px minmax(0, 1fr)",
                    columnGap: 10,
                    alignItems: "center",
                    padding: "10px 2px",
                    borderTop: "1px solid var(--v4-border-light)",
                  }}
                  title={`예정 ${fmtKrw(r.plannedAmount)} · 실행 ${fmtKrw(r.executedAmount)} (${(r.rate * 100).toFixed(1)}%)`}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <span
                      className="v4-tabular"
                      style={{
                        fontSize: 12.5,
                        fontWeight: isCurrent ? 600 : 500,
                        color: isCurrent
                          ? "var(--v4-text-info)"
                          : "var(--v4-text-primary)",
                      }}
                    >
                      {r.month}월
                    </span>
                    <span
                      className="v4-tabular"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: rateColor,
                      }}
                    >
                      {(r.rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    <BarRow
                      label={`예정 ${r.count}건`}
                      pct={plannedPct}
                      amount={r.plannedAmount}
                      track="var(--v4-bg-info)"
                      fill="var(--v4-info)"
                    />
                    <BarRow
                      label={`실행 ${r.executedCount}건`}
                      pct={executedPct}
                      amount={r.executedAmount}
                      track="var(--v4-bg-success)"
                      fill="var(--v4-success)"
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--v4-border-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--v4-text-secondary)",
              flexShrink: 0,
            }}
          >
            <span>
              합계 <strong style={{ color: "var(--v4-text-primary)" }}>{totals.count}건</strong>
            </span>
            <span className="v4-tabular">
              {fmtKrw(totals.executed)} / {fmtKrw(totals.planned)} ·{" "}
              <strong style={{ color: "var(--v4-text-primary)" }}>
                {(totalRate * 100).toFixed(1)}%
              </strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function TabButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 9px",
        borderRadius: 5,
        border: "none",
        background: active ? "var(--v4-bg-info)" : "transparent",
        color: active ? "var(--v4-text-info)" : "var(--v4-text-secondary)",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: "-0.2px",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--v4-bg-tertiary)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {children}
    </button>
  );
}

type BarRowProps = {
  label: string;
  pct: number;
  amount: number;
  track: string;
  fill: string;
};

function BarRow({ label, pct, amount, track, fill }: BarRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "62px minmax(0, 1fr) 72px",
        columnGap: 8,
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--v4-text-tertiary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "relative",
          height: 8,
          background: track,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: fill,
            borderRadius: 4,
          }}
        />
      </div>
      <span
        className="v4-tabular"
        style={{
          fontSize: 11.5,
          color: "var(--v4-text-secondary)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {fmtKrw(amount)}
      </span>
    </div>
  );
}
