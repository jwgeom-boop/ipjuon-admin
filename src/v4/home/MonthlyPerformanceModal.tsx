import { useEffect, useMemo, useRef } from "react";
import { Download, X } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import type { TaskItem } from "./TaskRow";

const ASSUMED_YEAR = new Date().getFullYear();

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
  if (!n) return "-";
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.round((n - eok * 100_000_000) / 10_000);
    return man > 0
      ? `${eok}억 ${man.toLocaleString("ko-KR")}만`
      : `${eok}억`;
  }
  return `${Math.round(n / 10_000).toLocaleString("ko-KR")}만`;
}

interface MonthRow {
  month: number;
  count: number;
  plannedAmount: number;
  executedAmount: number;
  executedCount: number;
  rate: number; // 0~1
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

const COL_PLANNED_BG = "#DDEBF7";
const COL_EXECUTED_BG = "#E2EFDA";
const ROW_PLANNED_TINT = "#F4F9FE";
const ROW_EXECUTED_TINT = "#F2F9EC";

interface ColDef {
  key: keyof MonthRow | "monthLabel";
  label: string;
  px: number;
  width: number; // Excel wch
  align: "left" | "center" | "right";
  group?: "planned" | "executed";
}

const COLS: ColDef[] = [
  { key: "monthLabel", label: "월", px: 90, width: 10, align: "center" },
  { key: "count", label: "건수", px: 70, width: 8, align: "right" },
  {
    key: "plannedAmount",
    label: "예정 금액",
    px: 160,
    width: 18,
    align: "right",
    group: "planned",
  },
  {
    key: "executedCount",
    label: "실행 건수",
    px: 80,
    width: 10,
    align: "right",
    group: "executed",
  },
  {
    key: "executedAmount",
    label: "실행 금액",
    px: 160,
    width: 18,
    align: "right",
    group: "executed",
  },
  { key: "rate", label: "달성률", px: 100, width: 12, align: "right" },
];

const TABLE_TOTAL_WIDTH = COLS.reduce((s, c) => s + c.px, 0);
const COL_BG = (g?: "planned" | "executed") =>
  g === "planned" ? COL_PLANNED_BG : g === "executed" ? COL_EXECUTED_BG : "var(--v4-bg-secondary)";

function cellValue(row: MonthRow, c: ColDef): string {
  switch (c.key) {
    case "monthLabel":
      return `${ASSUMED_YEAR}년 ${row.month}월`;
    case "count":
      return row.count.toLocaleString("ko-KR");
    case "plannedAmount":
      return fmtKrw(row.plannedAmount);
    case "executedCount":
      return row.executedCount.toLocaleString("ko-KR");
    case "executedAmount":
      return fmtKrw(row.executedAmount);
    case "rate":
      return `${(row.rate * 100).toFixed(1)}%`;
    default:
      return "";
  }
}

function totalsRow(rows: MonthRow[]): MonthRow {
  const totalPlanned = rows.reduce((s, r) => s + r.plannedAmount, 0);
  const totalExecuted = rows.reduce((s, r) => s + r.executedAmount, 0);
  return {
    month: 0,
    count: rows.reduce((s, r) => s + r.count, 0),
    plannedAmount: totalPlanned,
    executedAmount: totalExecuted,
    executedCount: rows.reduce((s, r) => s + r.executedCount, 0),
    rate: totalPlanned > 0 ? totalExecuted / totalPlanned : 0,
  };
}

export function MonthlyPerformanceModal({
  items,
  onClose,
}: {
  items: TaskItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => aggregate(items), [items]);
  const totals = useMemo(() => totalsRow(rows), [rows]);
  const maxAmount = useMemo(
    () => Math.max(1, ...rows.map((r) => Math.max(r.plannedAmount, r.executedAmount))),
    [rows]
  );

  useEffect(() => {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDownload = () => {
    const totalCols = COLS.length;
    const headerRow: string[] = COLS.map((c) => c.label);
    const bodyRows: (string | number)[][] = rows.map((r) =>
      COLS.map((c) => {
        if (c.key === "monthLabel") return `${ASSUMED_YEAR}년 ${r.month}월`;
        if (c.key === "rate") return Number((r.rate * 100).toFixed(1));
        return Number(r[c.key as keyof MonthRow] ?? 0);
      })
    );
    const totalsAoa: (string | number)[] = COLS.map((c) => {
      if (c.key === "monthLabel") return "합계";
      if (c.key === "rate") return Number((totals.rate * 100).toFixed(1));
      return Number(totals[c.key as keyof MonthRow] ?? 0);
    });

    const aoa: (string | number)[][] = [headerRow, ...bodyRows, totalsAoa];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const border = {
      top: { style: "thin", color: { rgb: "999999" } },
      bottom: { style: "thin", color: { rgb: "999999" } },
      left: { style: "thin", color: { rgb: "999999" } },
      right: { style: "thin", color: { rgb: "999999" } },
    };
    const baseFont = { name: "맑은 고딕", sz: 10 };

    // Header
    for (let c = 0; c < totalCols; c++) {
      const refStr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[refStr]) ws[refStr] = { t: "s", v: headerRow[c] ?? "" };
      const colDef = COLS[c];
      const fill =
        colDef.group === "planned"
          ? "DDEBF7"
          : colDef.group === "executed"
          ? "E2EFDA"
          : "F2F2F2";
      ws[refStr].s = {
        font: { ...baseFont, bold: true, sz: 11 },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: fill } },
        border,
      };
    }

    // Body
    rows.forEach((_row, rIdx) => {
      const r = rIdx + 1;
      COLS.forEach((col, c) => {
        const refStr = XLSX.utils.encode_cell({ r, c });
        if (!ws[refStr]) ws[refStr] = { t: "s", v: bodyRows[rIdx][c] ?? "" };
        const isMonth = col.key === "monthLabel";
        const isRate = col.key === "rate";
        const fill =
          col.group === "planned"
            ? "F4F9FE"
            : col.group === "executed"
            ? "F2F9EC"
            : "FFFFFF";
        if (!isMonth) {
          ws[refStr].t = "n";
          ws[refStr].z = isRate ? "0.0\"%\"" : "#,##0";
        }
        ws[refStr].s = {
          font: { ...baseFont, bold: isMonth },
          alignment: {
            horizontal: col.align,
            vertical: "center",
          },
          fill: { fgColor: { rgb: fill } },
          numFmt: isRate ? "0.0\"%\"" : isMonth ? undefined : "#,##0",
          border,
        };
      });
    });

    // Totals row
    const totalsRowIdx = rows.length + 1;
    COLS.forEach((col, c) => {
      const refStr = XLSX.utils.encode_cell({ r: totalsRowIdx, c });
      if (!ws[refStr]) ws[refStr] = { t: "s", v: totalsAoa[c] ?? "" };
      const isMonth = col.key === "monthLabel";
      const isRate = col.key === "rate";
      if (!isMonth) {
        ws[refStr].t = "n";
        ws[refStr].z = isRate ? "0.0\"%\"" : "#,##0";
      }
      ws[refStr].s = {
        font: { ...baseFont, bold: true },
        alignment: {
          horizontal: col.align,
          vertical: "center",
        },
        fill: { fgColor: { rgb: "FFF4CE" } },
        numFmt: isRate ? "0.0\"%\"" : isMonth ? undefined : "#,##0",
        border,
      };
    });

    ws["!cols"] = COLS.map((c) => ({ wch: c.width }));
    ws["!rows"] = [
      { hpt: 26 },
      ...rows.map(() => ({ hpt: 22 })),
      { hpt: 26 },
    ];
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length + 1, c: totalCols - 1 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "월별실적");
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `월별실적_${stamp}.xlsx`);
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-label="월별 실적"
        style={{
          width: "min(960px, 100%)",
          maxHeight: "92vh",
          background: "var(--v4-bg-primary)",
          borderRadius: "var(--v4-radius-md)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid var(--v4-border-tertiary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
                color: "var(--v4-text-primary)",
              }}
            >
              월별 실적
            </h2>
            <span
              className="v4-tabular"
              style={{ fontSize: 12, color: "var(--v4-text-tertiary)" }}
            >
              {rows.length}개월 · 총 {totals.count}건
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={rows.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "#fff",
                background: "var(--v4-success)",
                border: "none",
                borderRadius: "var(--v4-radius-md)",
                cursor: rows.length === 0 ? "not-allowed" : "pointer",
                opacity: rows.length === 0 ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              <Download size={13} strokeWidth={1.8} />
              엑셀 다운로드
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                border: "1px solid var(--v4-border-tertiary)",
                background: "var(--v4-bg-primary)",
                borderRadius: "var(--v4-radius-md)",
                cursor: "pointer",
                color: "var(--v4-text-secondary)",
                fontFamily: "inherit",
              }}
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            padding: "12px 18px",
            borderBottom: "1px solid var(--v4-border-tertiary)",
            background: "var(--v4-bg-secondary)",
          }}
        >
          <KpiCard label="예정 금액" value={fmtKrw(totals.plannedAmount)} tone="planned" />
          <KpiCard label="실행 금액" value={fmtKrw(totals.executedAmount)} tone="executed" />
          <KpiCard
            label="달성률"
            value={`${(totals.rate * 100).toFixed(1)}%`}
            tone="rate"
          />
        </div>

        <div style={{ overflow: "auto", flex: 1, padding: "0 18px 18px" }}>
          {rows.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                fontSize: 12,
                color: "var(--v4-text-tertiary)",
              }}
            >
              월별 실적 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "16px 0",
                }}
              >
                {rows.map((r) => (
                  <MonthBar
                    key={r.month}
                    monthLabel={`${r.month}월`}
                    planned={r.plannedAmount}
                    executed={r.executedAmount}
                    max={maxAmount}
                  />
                ))}
              </div>

              {/* Table */}
              <table
                style={{
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  fontSize: 11.5,
                  tableLayout: "fixed",
                  width: TABLE_TOTAL_WIDTH,
                  marginTop: 12,
                }}
              >
                <colgroup>
                  {COLS.map((c) => (
                    <col key={c.key} style={{ width: c.px, minWidth: c.px }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {COLS.map((c) => (
                      <th
                        key={c.key}
                        style={{
                          padding: "8px 10px",
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "var(--v4-text-secondary)",
                          background: COL_BG(c.group),
                          borderBottom: "1px solid var(--v4-border-secondary)",
                          borderRight: "1px solid var(--v4-border-tertiary)",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          boxSizing: "border-box",
                        }}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.month}>
                      {COLS.map((c) => {
                        const v = cellValue(row, c);
                        const tint =
                          c.group === "planned"
                            ? ROW_PLANNED_TINT
                            : c.group === "executed"
                            ? ROW_EXECUTED_TINT
                            : "var(--v4-bg-primary)";
                        return (
                          <td
                            key={c.key}
                            className={
                              c.align === "right" ? "v4-tabular" : undefined
                            }
                            style={{
                              padding: "7px 10px",
                              borderBottom:
                                "1px solid var(--v4-border-tertiary)",
                              borderRight:
                                "1px solid var(--v4-border-tertiary)",
                              color: "var(--v4-text-primary)",
                              textAlign: c.align,
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
                              boxSizing: "border-box",
                              background: tint,
                              fontWeight: c.key === "monthLabel" ? 600 : 400,
                            }}
                          >
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    {COLS.map((c) => {
                      const v =
                        c.key === "monthLabel"
                          ? "합계"
                          : cellValue(totals, c);
                      return (
                        <td
                          key={c.key}
                          className={
                            c.align === "right" ? "v4-tabular" : undefined
                          }
                          style={{
                            padding: "8px 10px",
                            borderTop: "2px solid var(--v4-border-secondary)",
                            borderRight: "1px solid var(--v4-border-tertiary)",
                            color: "var(--v4-text-primary)",
                            textAlign: c.align,
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                            boxSizing: "border-box",
                            background: "#FFF4CE",
                            fontWeight: 700,
                          }}
                        >
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "planned" | "executed" | "rate";
}) {
  const colorMap = {
    planned: { bg: "#DDEBF7", fg: "var(--v4-info)" },
    executed: { bg: "#E2EFDA", fg: "var(--v4-success)" },
    rate: { bg: "#FFF4CE", fg: "#9E7E1F" },
  } as const;
  const c = colorMap[tone];
  return (
    <div
      style={{
        background: c.bg,
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: "var(--v4-radius-md)",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--v4-text-secondary)", fontWeight: 600 }}>
        {label}
      </span>
      <span
        className="v4-tabular"
        style={{ fontSize: 16, fontWeight: 700, color: c.fg }}
      >
        {value}
      </span>
    </div>
  );
}

function MonthBar({
  monthLabel,
  planned,
  executed,
  max,
}: {
  monthLabel: string;
  planned: number;
  executed: number;
  max: number;
}) {
  const plannedPct = (planned / max) * 100;
  const executedPct = (executed / max) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        className="v4-tabular"
        style={{
          width: 42,
          fontSize: 12,
          color: "var(--v4-text-secondary)",
          fontWeight: 600,
          textAlign: "right",
        }}
      >
        {monthLabel}
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <BarRow
          label="예정"
          amount={planned}
          pct={plannedPct}
          color="var(--v4-info)"
          bg="#DDEBF7"
        />
        <BarRow
          label="실행"
          amount={executed}
          pct={executedPct}
          color="var(--v4-success)"
          bg="#E2EFDA"
        />
      </div>
    </div>
  );
}

function BarRow({
  label,
  amount,
  pct,
  color,
  bg,
}: {
  label: string;
  amount: number;
  pct: number;
  color: string;
  bg: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 28,
          fontSize: 10.5,
          color: "var(--v4-text-tertiary)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 14,
          background: bg,
          borderRadius: 4,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: color,
            borderRadius: 4,
            transition: "width 200ms",
          }}
        />
      </div>
      <span
        className="v4-tabular"
        style={{
          width: 100,
          fontSize: 11,
          color: "var(--v4-text-secondary)",
          textAlign: "right",
        }}
      >
        {fmtKrw(amount)}
      </span>
    </div>
  );
}
