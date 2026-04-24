import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import type { TaskItem } from "./TaskRow";
import { ModalShell, ModalHeader, modalActionButtonStyle } from "../shared/ModalShell";

type Stage = "consultation" | "reservation" | "signing" | "execution";
type StageFilter = "all" | Stage;

const STAGE_INFO: Record<
  Stage,
  {
    label: string;
    color: string;
    bg: string;
    bgRow: string;
    border: string;
    xlsxBg: string;
    xlsxRowBg: string;
  }
> = {
  consultation: {
    label: "상담",
    color: "var(--v4-info)",
    bg: "#DDEBF7",
    bgRow: "#F4F9FE",
    border: "var(--v4-info)",
    xlsxBg: "DDEBF7",
    xlsxRowBg: "F4F9FE",
  },
  reservation: {
    label: "예약",
    color: "#B45309",
    bg: "#FEF3C7",
    bgRow: "#FFFCEF",
    border: "#B45309",
    xlsxBg: "FEF3C7",
    xlsxRowBg: "FFFCEF",
  },
  signing: {
    label: "자서",
    color: "var(--v4-warning)",
    bg: "#FFF2CC",
    bgRow: "#FFFBEB",
    border: "var(--v4-warning)",
    xlsxBg: "FFF2CC",
    xlsxRowBg: "FFFBEB",
  },
  execution: {
    label: "실행",
    color: "var(--v4-success)",
    bg: "#E2EFDA",
    bgRow: "#F2F9EC",
    border: "var(--v4-success)",
    xlsxBg: "E2EFDA",
    xlsxRowBg: "F2F9EC",
  },
};

const SIGNING_TAGS = new Set(["자서", "지연"]);
const EXECUTION_TAGS = new Set(["실행"]);
const RESERVATION_TAGS = new Set(["예약", "자서예약"]);

function classifyStage(tag?: string): Stage {
  if (!tag) return "consultation";
  if (EXECUTION_TAGS.has(tag)) return "execution";
  if (RESERVATION_TAGS.has(tag)) return "reservation";
  if (SIGNING_TAGS.has(tag)) return "signing";
  return "consultation";
}

function parseDongHo(label?: string): string {
  if (!label) return "";
  const head = label.split("·")[0]?.trim() ?? "";
  return head;
}

function fmtMan(n?: number): string {
  if (!n || n <= 0) return "-";
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.round((n - eok * 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
  }
  return `${Math.round(n / 10_000).toLocaleString("ko-KR")}만`;
}

function combineNote(note?: string, internal?: string): string {
  const a = note?.trim();
  const b = internal?.trim();
  if (a && b) return `${a} / ${b}`;
  return a || b || "";
}

interface Row {
  id: string;
  stage: Stage;
  tag: string;
  assignee: string;
  contractor: string;
  phone: string;
  size: string;
  dongHo: string;
  nextAction: string;
  loanAmount: string;
  loanAmountRaw: number;
  executionDate: string;
  time: string;
  note: string;
}

interface ColDef {
  key: keyof Row | "stage";
  label: string;
  px: number;
  width: number;
  align?: "left" | "center" | "right";
}

const COLS: ColDef[] = [
  { key: "stage", label: "단계", px: 78, width: 8, align: "center" },
  { key: "tag", label: "상태", px: 80, width: 9, align: "center" },
  { key: "assignee", label: "담당자", px: 78, width: 8, align: "center" },
  { key: "contractor", label: "계약자", px: 100, width: 12, align: "center" },
  { key: "phone", label: "전번", px: 130, width: 16, align: "center" },
  { key: "size", label: "평형", px: 60, width: 6, align: "center" },
  { key: "dongHo", label: "동-호수", px: 90, width: 10, align: "center" },
  { key: "nextAction", label: "다음 액션", px: 320, width: 42, align: "left" },
  { key: "loanAmount", label: "대출금액", px: 110, width: 14, align: "right" },
  { key: "executionDate", label: "실행/자서일", px: 110, width: 14, align: "center" },
  { key: "time", label: "마감/시간", px: 110, width: 14, align: "center" },
  { key: "note", label: "비고", px: 280, width: 36, align: "left" },
];

const STICKY_COUNT = 4;
const STICKY_LEFTS: number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < STICKY_COUNT; i++) {
    out.push(acc);
    acc += COLS[i].px;
  }
  return out;
})();
const TABLE_TOTAL_WIDTH = COLS.reduce((s, c) => s + c.px, 0);
const LOAN_COL_IDX = COLS.findIndex((c) => c.key === "loanAmount");

function formatExecDateKR(s?: string): string | undefined {
  if (!s) return undefined;
  const iso = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return `${parseInt(iso[1], 10)}월 ${parseInt(iso[2], 10)}일`;
  return s;
}

function toRow(t: TaskItem): Row {
  const stage = classifyStage(t.tag);
  const loanRaw = t.loanAmount ?? 0;
  return {
    id: t.id,
    stage,
    tag: t.tag ?? "-",
    assignee: t.assignee ?? "-",
    contractor: t.borrower ?? t.customerName,
    phone: t.phones?.[0] ?? t.phone ?? "-",
    size: t.size ? `${t.size}` : "-",
    dongHo: parseDongHo(t.addressLabel),
    nextAction: t.nextAction,
    loanAmount: fmtMan(t.loanAmount),
    loanAmountRaw: loanRaw,
    executionDate: t.signingDateLabel ?? formatExecDateKR(t.executionDate) ?? "-",
    time: t.time ?? "-",
    note: combineNote(t.note, t.internalNote) || "-",
  };
}

const STAGE_ORDER: Stage[] = ["consultation", "reservation", "signing", "execution"];

export type ConsultationStage = Stage;

export function ConsultationListModal({
  items,
  onClose,
  onRowClick,
}: {
  items: TaskItem[];
  onClose: () => void;
  onRowClick?: (id: string, stage: Stage) => void;
}) {
  const [filter, setFilter] = useState<StageFilter>("all");

  const allRows = useMemo(() => {
    const arr = items.map(toRow);
    arr.sort(
      (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
    );
    return arr;
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<Stage, number> = {
      consultation: 0,
      reservation: 0,
      signing: 0,
      execution: 0,
    };
    allRows.forEach((r) => {
      c[r.stage] += 1;
    });
    return c;
  }, [allRows]);

  const rows = useMemo(() => {
    if (filter === "all") return allRows;
    return allRows.filter((r) => r.stage === filter);
  }, [allRows, filter]);

  // Sum of loanAmount for rows where loanAmount > 0.
  // Only relevant for reservation/signing/execution; for consultation returns 0.
  const loanSum = useMemo(() => {
    if (filter === "consultation") return 0;
    return rows
      .filter((r) => filter === "all" ? r.stage !== "consultation" : true)
      .reduce((s, r) => s + (r.loanAmountRaw || 0), 0);
  }, [rows, filter]);

  const showSum = filter !== "consultation" && loanSum > 0;

  const handleDownload = () => {
    const totalCols = COLS.length;
    const headerRow: string[] = COLS.map((c) => c.label);
    const bodyRows: string[][] = rows.map((r) =>
      COLS.map((c) => {
        if (c.key === "stage") return STAGE_INFO[r.stage].label;
        const v = r[c.key as keyof Row];
        return v == null ? "" : String(v);
      })
    );

    const aoa: string[][] = [headerRow, ...bodyRows];
    if (showSum) {
      const sumRow: string[] = COLS.map((c, idx) => {
        if (idx === 0) return "합계";
        if (c.key === "loanAmount") return fmtMan(loanSum);
        return "";
      });
      aoa.push(sumRow);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const border = {
      top: { style: "thin", color: { rgb: "999999" } },
      bottom: { style: "thin", color: { rgb: "999999" } },
      left: { style: "thin", color: { rgb: "999999" } },
      right: { style: "thin", color: { rgb: "999999" } },
    };
    const baseFont = { name: "맑은 고딕", sz: 10 };

    for (let c = 0; c < totalCols; c++) {
      const refStr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[refStr]) ws[refStr] = { t: "s", v: headerRow[c] ?? "" };
      ws[refStr].s = {
        font: { ...baseFont, bold: true, sz: 11 },
        alignment: { horizontal: "center", vertical: "center", wrapText: false },
        fill: { fgColor: { rgb: "F2F2F2" } },
        border,
      };
    }

    rows.forEach((row, rIdx) => {
      const r = rIdx + 1;
      const stageInfo = STAGE_INFO[row.stage];
      COLS.forEach((col, c) => {
        const refStr = XLSX.utils.encode_cell({ r, c });
        if (!ws[refStr]) ws[refStr] = { t: "s", v: bodyRows[rIdx][c] ?? "" };
        const isStageCol = col.key === "stage";
        ws[refStr].s = {
          font: {
            ...baseFont,
            bold: isStageCol,
            color: isStageCol ? { rgb: "1F4E78" } : undefined,
          },
          alignment: {
            horizontal: col.align ?? "center",
            vertical: "center",
            wrapText: false,
          },
          fill: {
            fgColor: { rgb: isStageCol ? stageInfo.xlsxBg : stageInfo.xlsxRowBg },
          },
          border,
        };
      });
    });

    if (showSum) {
      const sumRowIdx = rows.length + 1;
      COLS.forEach((col, c) => {
        const refStr = XLSX.utils.encode_cell({ r: sumRowIdx, c });
        if (!ws[refStr]) ws[refStr] = { t: "s", v: "" };
        ws[refStr].s = {
          font: { ...baseFont, bold: true, sz: 11 },
          alignment: {
            horizontal: col.key === "loanAmount" ? "right" : "center",
            vertical: "center",
          },
          fill: { fgColor: { rgb: "F2F2F2" } },
          border,
        };
      });
    }

    ws["!cols"] = COLS.map((c) => ({ wch: c.width }));
    const rowHeights: { hpt: number }[] = [{ hpt: 24 }, ...rows.map(() => ({ hpt: 22 }))];
    if (showSum) rowHeights.push({ hpt: 24 });
    ws["!rows"] = rowHeights;
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length + (showSum ? 1 : 0), c: totalCols - 1 },
    });
    ws["!freeze"] = { xSplit: 0, ySplit: 1 } as unknown as never;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상담리스트");
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `상담리스트_${stamp}.xlsx`);
  };

  const tabs: { key: StageFilter; label: string; count: number; color?: string; bg?: string }[] = [
    { key: "all", label: "전체", count: allRows.length },
    ...STAGE_ORDER.map((s) => ({
      key: s,
      label: STAGE_INFO[s].label,
      count: counts[s],
      color: STAGE_INFO[s].color,
      bg: STAGE_INFO[s].bg,
    })),
  ];

  return (
    <ModalShell size="L" ariaLabel="상담 리스트" onClose={onClose}>
      <ModalHeader
        title="상담 리스트"
        badge={`총 ${allRows.length}건`}
        onClose={onClose}
        titleExtras={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tabs.map((t) => {
              const active = filter === t.key;
              const isAll = t.key === "all";
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilter(t.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: active
                      ? (isAll ? "var(--v4-text-primary)" : t.bg ?? "var(--v4-bg-secondary)")
                      : "var(--v4-bg-secondary)",
                    color: active
                      ? (isAll ? "#fff" : t.color ?? "var(--v4-text-primary)")
                      : "var(--v4-text-secondary)",
                    border: active
                      ? `1px solid ${isAll ? "var(--v4-text-primary)" : (t.color ?? "var(--v4-border-primary)")}`
                      : "1px solid var(--v4-border-light)",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    lineHeight: 1.3,
                  }}
                >
                  {!isAll ? (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.color,
                      }}
                    />
                  ) : null}
                  {t.label} {t.count}
                </button>
              );
            })}
          </div>
        }
        actions={
          <button
            type="button"
            onClick={handleDownload}
            disabled={rows.length === 0}
            style={modalActionButtonStyle({ primary: true, disabled: rows.length === 0 })}
          >
            <Download size={13} strokeWidth={1.8} />
            엑셀 다운로드
          </button>
        }
      />

        <div style={{ overflow: "auto", flex: 1 }}>
          {rows.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                fontSize: 12,
                color: "var(--v4-text-tertiary)",
              }}
            >
              표시할 상담이 없습니다.
            </div>
          ) : (
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 12,
                tableLayout: "fixed",
                width: TABLE_TOTAL_WIDTH,
              }}
            >
              <colgroup>
                {COLS.map((c) => (
                  <col
                    key={c.key}
                    style={{ width: c.px, minWidth: c.px }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COLS.map((c, idx) => {
                    const isSticky = idx < STICKY_COUNT;
                    const isLastSticky = idx === STICKY_COUNT - 1;
                    return (
                      <th
                        key={c.key}
                        style={{
                          padding: "9px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--v4-text-secondary)",
                          background: "var(--v4-bg-secondary)",
                          borderBottom: "1px solid var(--v4-border-secondary)",
                          borderRight: "1px solid var(--v4-border-tertiary)",
                          textAlign: "center",
                          position: "sticky",
                          top: 0,
                          left: isSticky ? STICKY_LEFTS[idx] : undefined,
                          zIndex: isSticky ? 5 : 3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          boxShadow: isLastSticky
                            ? "2px 0 4px -2px rgba(0,0,0,0.12)"
                            : undefined,
                          boxSizing: "border-box",
                        }}
                      >
                        {c.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const info = STAGE_INFO[row.stage];
                  const rowBg = info.bgRow;
                  const clickable = !!onRowClick;
                  return (
                    <tr
                      key={row.id}
                      onClick={
                        clickable
                          ? () => onRowClick!(row.id, row.stage)
                          : undefined
                      }
                      className={clickable ? "v4-clrow" : undefined}
                      style={{ cursor: clickable ? "pointer" : undefined }}
                    >
                      {COLS.map((c, cIdx) => {
                        const isSticky = cIdx < STICKY_COUNT;
                        const isStageCol = c.key === "stage";
                        const isFirstCol = cIdx === 0;
                        return (
                          <td
                            key={c.key}
                            style={{
                              padding: "8px 10px",
                              borderBottom:
                                "1px solid var(--v4-border-tertiary)",
                              borderRight:
                                "1px solid var(--v4-border-tertiary)",
                              borderLeft: isFirstCol
                                ? `3px solid ${info.border}`
                                : undefined,
                              color: "var(--v4-text-primary)",
                              textAlign: c.align ?? "center",
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              boxSizing: "border-box",
                              background: rowBg,
                              position: isSticky ? "sticky" : undefined,
                              left: isSticky ? STICKY_LEFTS[cIdx] : undefined,
                              zIndex: isSticky ? 1 : undefined,
                              boxShadow:
                                isSticky && cIdx === STICKY_COUNT - 1
                                  ? "2px 0 4px -2px rgba(0,0,0,0.12)"
                                  : undefined,
                              fontWeight: isStageCol ? 600 : 400,
                            }}
                          >
                            {isStageCol ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: info.bg,
                                  color: info.color,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {info.label}
                              </span>
                            ) : (
                              row[c.key as keyof Row]
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              {showSum ? (
                <tfoot>
                  <tr>
                    {COLS.map((c, cIdx) => {
                      // 첫 번째 sticky 컬럼에 STICKY_COUNT칸을 합쳐 "합계" 라벨을 넣고,
                      // 나머지 sticky 셀은 렌더하지 않는다(좁은 단계 컬럼 잘림 방지).
                      if (cIdx > 0 && cIdx < STICKY_COUNT) return null;
                      const isFirst = cIdx === 0;
                      const isSticky = cIdx < STICKY_COUNT;
                      const isLoan = cIdx === LOAN_COL_IDX;
                      return (
                        <td
                          key={c.key}
                          colSpan={isFirst ? STICKY_COUNT : 1}
                          style={{
                            padding: "9px 12px",
                            borderTop: "1.5px solid var(--v4-border-secondary)",
                            borderRight: "1px solid var(--v4-border-tertiary)",
                            background: "var(--v4-bg-secondary)",
                            fontWeight: 700,
                            fontSize: 12.5,
                            color: "var(--v4-text-primary)",
                            textAlign: isFirst ? "left" : c.align ?? "center",
                            position: "sticky",
                            bottom: 0,
                            left: isSticky ? STICKY_LEFTS[cIdx] : undefined,
                            zIndex: isSticky ? 4 : 2,
                            whiteSpace: "nowrap",
                            boxShadow: isFirst
                              ? "2px 0 4px -2px rgba(0,0,0,0.12)"
                              : undefined,
                          }}
                        >
                          {isFirst
                            ? filter === "all"
                              ? "합계 (상담 제외)"
                              : `${STAGE_INFO[filter as Stage].label} 합계`
                            : isLoan
                            ? fmtMan(loanSum)
                            : ""}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          )}
        </div>
        <style>{`
          .v4-clrow:hover td {
            filter: brightness(0.96);
          }
        `}</style>
    </ModalShell>
  );
}
