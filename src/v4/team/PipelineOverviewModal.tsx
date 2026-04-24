import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Download, Filter } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";
import { getConsultationFixture } from "../wizard/consultationFixtures";
import { getSigningFixture } from "../wizard/signingFixtures";
import { getExecutionFixture } from "../wizard/executionFixtures";
import { diffDaysFromToday, formatDday, ddayTone } from "../lib/dday";
import { exportPipelineToExcel } from "./pipelineExport";
import { ModalShell, ModalHeader, modalActionButtonStyle } from "../shared/ModalShell";

type Props = {
  items: TaskItem[];
  scopeLabel: string;
  onClose: () => void;
};

function splitAddress(label?: string): { dongHo: string; complex: string } {
  if (!label) return { dongHo: "", complex: "" };
  const parts = label.split(/\s*·\s*/);
  return { dongHo: parts[0]?.trim() ?? "", complex: parts[1]?.trim() ?? "" };
}

const won = (n?: number) =>
  n && n > 0 ? n.toLocaleString("ko-KR") : "—";

const dash = (s?: string) => (s && s.trim() ? s : "—");

function pickFixtures(taskId: string) {
  const c = getConsultationFixture(taskId);
  const s = getSigningFixture(taskId);
  const e = getExecutionFixture(taskId);
  return {
    c: c.id === taskId ? c : null,
    s: s.id === taskId ? s : null,
    e: e.id === taskId ? e : null,
  };
}

type ColDef = { key: string; label: string; w: number; filter?: FilterKey };
type StageGroup = { label: string; cols: ColDef[] };

const GROUPS: StageGroup[] = [
  {
    label: "상담",
    cols: [
      { key: "intakeDate", label: "상담일", w: 96 },
      { key: "tag", label: "태그", w: 80, filter: "tag" },
      { key: "assignee", label: "담당자", w: 96, filter: "assignee" },
    ],
  },
  {
    label: "예약",
    cols: [
      { key: "scheduledSigning", label: "예약일", w: 96 },
      { key: "nextStep", label: "다음", w: 96, filter: "nextStep" },
    ],
  },
  {
    label: "자서",
    cols: [
      { key: "signingDate", label: "자서일", w: 96 },
      { key: "signingTime", label: "시간", w: 60 },
      { key: "signingLocation", label: "장소", w: 220 },
    ],
  },
  {
    label: "실행",
    cols: [
      { key: "executionDate", label: "실행일", w: 110 },
      { key: "loanAmount", label: "대출금", w: 120 },
      { key: "remark", label: "비고", w: 200 },
    ],
  },
  {
    label: "상환",
    cols: [
      { key: "middlePrincipal", label: "중도금 원금", w: 120 },
      { key: "middleInterest", label: "중도금 이자", w: 110 },
      { key: "balancePrincipal", label: "잔금 원금", w: 120 },
      { key: "balanceInterest", label: "잔금 이자", w: 100 },
      { key: "balcony", label: "발코니", w: 100 },
      { key: "options", label: "옵션", w: 100 },
      { key: "guaranteeFee", label: "보증료", w: 100 },
      { key: "mgmtFee", label: "관리비", w: 100 },
      { key: "movingAllowance", label: "이사비", w: 100 },
      { key: "stampDuty", label: "인지세", w: 100 },
      { key: "stampDutyAdditional", label: "추가 인지세", w: 110 },
      { key: "additionalLoan", label: "추가 대출", w: 110 },
    ],
  },
];

const GROUP_TONE: Record<string, { bg: string; color: string }> = {
  상담: { bg: "var(--v4-bg-info)", color: "var(--v4-text-info)" },
  예약: { bg: "#FEF3C7", color: "#B45309" },
  자서: { bg: "var(--v4-bg-warning)", color: "var(--v4-warning)" },
  실행: { bg: "var(--v4-bg-success, #ecfdf5)", color: "var(--v4-success, #15803d)" },
  상환: { bg: "var(--v4-bg-tertiary)", color: "var(--v4-text-secondary)" },
};

type FilterKey = "complex" | "tag" | "assignee" | "nextStep";

function ColumnFilter({
  values,
  selected,
  onChange,
  align = "left",
}: {
  values: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const isActive = selected.size > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const popover = document.getElementById("v4-pipeline-filter-pop");
      if (popover?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 200;
      setPos({
        top: r.bottom + 4,
        left: align === "right" ? r.right - popoverWidth : r.left,
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title={isActive ? `필터 ${selected.size}개 적용 중` : "필터"}
        style={{
          marginLeft: 4,
          width: 18,
          height: 18,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: isActive ? "var(--v4-bg-info)" : "transparent",
          color: isActive ? "var(--v4-text-info)" : "var(--v4-text-tertiary)",
          borderRadius: 4,
          cursor: "pointer",
          verticalAlign: "middle",
        }}
      >
        <Filter size={11} strokeWidth={2} />
      </button>
      {open && pos
        ? createPortal(
            <div
              id="v4-pipeline-filter-pop"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                zIndex: 100,
                width: 200,
                background: "var(--v4-bg-primary)",
                border: "1px solid var(--v4-border-tertiary)",
                borderRadius: 6,
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
                padding: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--v4-border-light)",
                }}
              >
                <button
                  type="button"
                  onClick={() => onChange(new Set())}
                  style={{
                    fontSize: 11.5,
                    color: "var(--v4-text-secondary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  전체 해제
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    fontSize: 11.5,
                    color: "var(--v4-text-info)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  완료
                </button>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto", padding: "4px 0" }}>
                {values.length === 0 ? (
                  <div style={{ padding: "8px 6px", fontSize: 12, color: "var(--v4-text-tertiary)", textAlign: "center" }}>
                    값 없음
                  </div>
                ) : (
                  values.map((v) => {
                    const checked = selected.has(v);
                    return (
                      <label
                        key={v}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 6px",
                          fontSize: 12.5,
                          cursor: "pointer",
                          borderRadius: 4,
                          color: "var(--v4-text-primary)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v4-bg-tertiary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selected);
                            if (checked) next.delete(v);
                            else next.add(v);
                            onChange(next);
                          }}
                          style={{ margin: 0, cursor: "pointer" }}
                        />
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {v}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const STICKY_COLS: {
  key: "complex" | "dongHo" | "name" | "phone";
  label: string;
  w: number;
  left: number;
  filter?: FilterKey;
}[] = [
  { key: "complex", label: "아파트", w: 170, left: 0, filter: "complex" },
  { key: "dongHo", label: "동호수", w: 80, left: 170 },
  { key: "name", label: "계약자", w: 90, left: 250 },
  { key: "phone", label: "전화", w: 130, left: 340 },
];
const STICKY_TOTAL = 470;

type Row = {
  task: TaskItem;
  dongHo: string;
  complex: string;
  c: ReturnType<typeof getConsultationFixture> | null;
  s: ReturnType<typeof getSigningFixture> | null;
  e: ReturnType<typeof getExecutionFixture> | null;
};

function getFilterValue(r: Row, key: FilterKey): string {
  switch (key) {
    case "complex":
      return r.complex;
    case "tag":
      return r.task.tag ?? "";
    case "assignee":
      return r.task.assignee ?? "";
    case "nextStep":
      return r.c?.nextStep ?? "";
  }
}

export function PipelineOverviewModal({ items, scopeLabel, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, Set<string>>>({
    complex: new Set(),
    tag: new Set(),
    assignee: new Set(),
    nextStep: new Set(),
  });

  const rows = useMemo<Row[]>(() => {
    return items.map((t) => {
      const { dongHo, complex } = splitAddress(t.addressLabel);
      const fx = pickFixtures(t.id);
      return { task: t, dongHo, complex, ...fx };
    });
  }, [items]);

  const distinctValues = useMemo<Record<FilterKey, string[]>>(() => {
    const sets: Record<FilterKey, Set<string>> = {
      complex: new Set(),
      tag: new Set(),
      assignee: new Set(),
      nextStep: new Set(),
    };
    rows.forEach((r) => {
      (Object.keys(sets) as FilterKey[]).forEach((k) => {
        const v = getFilterValue(r, k);
        if (v) sets[k].add(v);
      });
    });
    return {
      complex: Array.from(sets.complex).sort(),
      tag: Array.from(sets.tag).sort(),
      assignee: Array.from(sets.assignee).sort(),
      nextStep: Array.from(sets.nextStep).sort(),
    };
  }, [rows]);

  const setFilter = (key: FilterKey, next: Set<string>) =>
    setFilters((prev) => ({ ...prev, [key]: next }));

  const clearAllFilters = () =>
    setFilters({ complex: new Set(), tag: new Set(), assignee: new Set(), nextStep: new Set() });

  const activeFilterCount = (Object.keys(filters) as FilterKey[]).reduce(
    (sum, k) => sum + (filters[k].size > 0 ? 1 : 0),
    0,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const { task: t, dongHo, complex } = r;
      if (q) {
        const hit =
          t.customerName.toLowerCase().includes(q) ||
          dongHo.toLowerCase().includes(q) ||
          complex.toLowerCase().includes(q) ||
          (t.assignee ?? "").toLowerCase().includes(q) ||
          (t.phone ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      for (const key of Object.keys(filters) as FilterKey[]) {
        const set = filters[key];
        if (set.size === 0) continue;
        if (!set.has(getFilterValue(r, key))) return false;
      }
      return true;
    });
  }, [rows, query, filters]);

  const totalScrollWidth =
    STICKY_TOTAL + GROUPS.reduce((sum, g) => sum + g.cols.reduce((s, c) => s + c.w, 0), 0);

  return createPortal(
    <ModalShell
      size="L"
      ariaLabel="전체 진행현황"
      onClose={onClose}
      className="v4-pipeline-modal"
      shellClassName="v4-pipeline-modal-shell"
    >
      <style>{`
        .v4-pipeline-table { border-collapse: separate; border-spacing: 0; font-size: 12px; }
        .v4-pipeline-table thead th {
          position: sticky;
          background: var(--v4-bg-secondary);
          z-index: 2;
          border-bottom: 1px solid var(--v4-border-tertiary);
          font-weight: 600;
          color: var(--v4-text-secondary);
          letter-spacing: -0.1px;
          padding: 6px 8px;
          text-align: left;
          white-space: nowrap;
        }
        .v4-pipeline-table thead tr.group-row th { top: 0; height: 26px; font-size: 11.5px; }
        .v4-pipeline-table thead tr.col-row th { top: 26px; height: 28px; }
        .v4-pipeline-table tbody td {
          padding: 8px;
          border-bottom: 1px solid var(--v4-border-light);
          color: var(--v4-text-primary);
          white-space: nowrap;
          background: var(--v4-bg-primary);
          vertical-align: middle;
        }
        .v4-pipeline-table tbody tr:hover td {
          background: #fafaf9;
        }
        .v4-pipeline-sticky {
          position: sticky;
          z-index: 1;
        }
        .v4-pipeline-table thead th.v4-pipeline-sticky { z-index: 3; }
        .v4-pipeline-num { font-variant-numeric: tabular-nums; text-align: right; }
        .v4-pipeline-empty { color: var(--v4-text-tertiary); }
      `}</style>

        <ModalHeader
          title={`전체 진행현황 — ${scopeLabel}`}
          badge={`${filtered.length}/${rows.length}건`}
          onClose={onClose}
          titleExtras={
            activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  height: 22,
                  padding: "0 8px",
                  fontSize: 11.5,
                  color: "var(--v4-text-info)",
                  background: "var(--v4-bg-info)",
                  border: "1px solid var(--v4-border-info, transparent)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 500,
                }}
                title="적용된 필터 모두 해제"
              >
                <Filter size={11} strokeWidth={2} />
                필터 {activeFilterCount} 해제
              </button>
            ) : null
          }
          actions={
            <>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  background: "var(--v4-bg-secondary)",
                  border: "1px solid var(--v4-border-tertiary)",
                  borderRadius: 6,
                  fontSize: 12.5,
                  color: "var(--v4-text-secondary)",
                  width: 220,
                }}
              >
                <Search size={13} strokeWidth={1.8} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="고객·아파트·담당자 검색"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    color: "var(--v4-text-primary)",
                    minWidth: 0,
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => exportPipelineToExcel(filtered.map((r) => r.task), scopeLabel)}
                title="현재 화면(필터 적용)을 Excel 파일로 다운로드"
                disabled={filtered.length === 0}
                style={modalActionButtonStyle({ disabled: filtered.length === 0 })}
              >
                <Download size={13} strokeWidth={1.8} />
                엑셀 다운로드
              </button>
            </>
          }
        />

        {/* Table */}
        <div
          className="v4-pipeline-table-wrap"
          style={{ flex: 1, minHeight: 0, overflow: "auto" }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "60px 12px",
                textAlign: "center",
                color: "var(--v4-text-tertiary)",
                fontSize: 13,
              }}
            >
              표시할 항목이 없습니다.
            </div>
          ) : (
            <table
              className="v4-pipeline-table"
              style={{ width: totalScrollWidth, tableLayout: "fixed" }}
            >
              <colgroup>
                {STICKY_COLS.map((c) => (
                  <col key={c.key} style={{ width: c.w }} />
                ))}
                {GROUPS.flatMap((g) =>
                  g.cols.map((c) => <col key={`${g.label}-${c.key}`} style={{ width: c.w }} />),
                )}
              </colgroup>
              <thead>
                <tr className="group-row">
                  <th
                    colSpan={STICKY_COLS.length}
                    className="v4-pipeline-sticky"
                    style={{
                      left: 0,
                      width: STICKY_TOTAL,
                      background: "var(--v4-bg-secondary)",
                      borderRight: "1px solid var(--v4-border-tertiary)",
                    }}
                  >
                    고객
                  </th>
                  {GROUPS.map((g) => {
                    const tone = GROUP_TONE[g.label];
                    return (
                      <th
                        key={g.label}
                        colSpan={g.cols.length}
                        style={{
                          background: tone.bg,
                          color: tone.color,
                          textAlign: "center",
                          borderLeft: "1px solid var(--v4-border-tertiary)",
                        }}
                      >
                        {g.label}
                      </th>
                    );
                  })}
                </tr>
                <tr className="col-row">
                  {STICKY_COLS.map((c, i) => (
                    <th
                      key={c.key}
                      className="v4-pipeline-sticky"
                      style={{
                        left: c.left,
                        width: c.w,
                        borderRight:
                          i === STICKY_COLS.length - 1
                            ? "1px solid var(--v4-border-tertiary)"
                            : undefined,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center" }}>
                        {c.label}
                        {c.filter ? (
                          <ColumnFilter
                            values={distinctValues[c.filter]}
                            selected={filters[c.filter]}
                            onChange={(next) => setFilter(c.filter!, next)}
                          />
                        ) : null}
                      </span>
                    </th>
                  ))}
                  {GROUPS.flatMap((g) =>
                    g.cols.map((c, ci) => {
                      const numeric = !!c.key.match(
                        /Amount|Principal|Interest|Fee|Allowance|Duty|balcony|options|additionalLoan|loanAmount/,
                      );
                      return (
                        <th
                          key={`${g.label}-${c.key}`}
                          style={{
                            borderLeft:
                              ci === 0 ? "1px solid var(--v4-border-tertiary)" : undefined,
                            textAlign: numeric ? "right" : "left",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center" }}>
                            {c.label}
                            {c.filter ? (
                              <ColumnFilter
                                values={distinctValues[c.filter]}
                                selected={filters[c.filter]}
                                onChange={(next) => setFilter(c.filter!, next)}
                              />
                            ) : null}
                          </span>
                        </th>
                      );
                    }),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ task: t, dongHo, complex, c, s, e }) => {
                  const diff = diffDaysFromToday(t.executionDate ?? e?.executionDate);
                  const tone = ddayTone(diff);
                  return (
                    <tr key={t.id}>
                      <td
                        className="v4-pipeline-sticky"
                        style={{
                          left: 0,
                          width: STICKY_COLS[0].w,
                          fontWeight: 500,
                          color: "var(--v4-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={complex}
                      >
                        {dash(complex)}
                      </td>
                      <td
                        className="v4-pipeline-sticky v4-tabular"
                        style={{
                          left: STICKY_COLS[1].left,
                          width: STICKY_COLS[1].w,
                          color: "var(--v4-text-secondary)",
                        }}
                      >
                        {dash(dongHo)}
                      </td>
                      <td
                        className="v4-pipeline-sticky"
                        style={{
                          left: STICKY_COLS[2].left,
                          width: STICKY_COLS[2].w,
                          fontWeight: 600,
                        }}
                      >
                        {t.customerName}
                      </td>
                      <td
                        className="v4-pipeline-sticky v4-tabular"
                        style={{
                          left: STICKY_COLS[3].left,
                          width: STICKY_COLS[3].w,
                          color: "var(--v4-text-secondary)",
                          borderRight: "1px solid var(--v4-border-tertiary)",
                        }}
                      >
                        {t.phone ? (
                          <a
                            href={`tel:${t.phone.replace(/-/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: "inherit",
                              textDecoration: "none",
                            }}
                          >
                            {t.phone}
                          </a>
                        ) : (
                          <span className="v4-pipeline-empty">—</span>
                        )}
                      </td>

                      {/* 상담 */}
                      <td className="v4-tabular">{dash(c?.intakeDate)}</td>
                      <td>{t.tag ? <span className={`v4-tag v4-tag-neutral`}>{t.tag}</span> : <span className="v4-pipeline-empty">—</span>}</td>
                      <td>{dash(t.assignee)}</td>

                      {/* 예약 */}
                      <td className="v4-tabular">{dash(c?.scheduledSigningDate)}</td>
                      <td>{dash(c?.nextStep)}</td>

                      {/* 자서 */}
                      <td className="v4-tabular">{dash(s?.signingDate)}</td>
                      <td className="v4-tabular">{dash(s?.signingTime)}</td>
                      <td title={s?.signingLocation} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {dash(s?.signingLocation)}
                      </td>

                      {/* 실행 */}
                      <td>
                        {diff != null ? (
                          <span
                            className="v4-tabular"
                            title={t.executionDate ?? e?.executionDate}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: tone.bg,
                              color: tone.color,
                              letterSpacing: 0.3,
                            }}
                          >
                            {(t.executionDate ?? e?.executionDate ?? "").slice(5)} · {formatDday(diff)}
                          </span>
                        ) : (
                          <span className="v4-pipeline-empty">—</span>
                        )}
                      </td>
                      <td className="v4-pipeline-num">{won(e?.loanAmount)}</td>
                      <td title={e?.remark} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {dash(e?.remark)}
                      </td>

                      {/* 상환 */}
                      <td className="v4-pipeline-num">{won(e?.middlePrincipal)}</td>
                      <td className="v4-pipeline-num">{won(e?.middleInterest)}</td>
                      <td className="v4-pipeline-num">{won(e?.balancePrincipal)}</td>
                      <td className="v4-pipeline-num">{won(e?.balanceInterest)}</td>
                      <td className="v4-pipeline-num">{won(e?.balcony)}</td>
                      <td className="v4-pipeline-num">{won(e?.options)}</td>
                      <td className="v4-pipeline-num">{won(e?.guaranteeFee)}</td>
                      <td className="v4-pipeline-num">{won(e?.mgmtFee)}</td>
                      <td className="v4-pipeline-num">{won(e?.movingAllowance)}</td>
                      <td className="v4-pipeline-num">{won(e?.stampDuty)}</td>
                      <td className="v4-pipeline-num">{won(e?.stampDutyAdditional)}</td>
                      <td className="v4-pipeline-num">{won(e?.additionalLoan)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
    </ModalShell>,
    document.body,
  );
}
