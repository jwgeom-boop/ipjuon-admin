import { useEffect, useMemo, useRef } from "react";
import { Download, X } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import type { TaskItem } from "./TaskRow";

const BANK = {
  loanBank: "국민은행",
  branch: "부전동",
  branchManager: "조연진대리님",
  branchPhone: "051-811-5131",
  branchFax: "051-809-5524",
  intermediateBank: "국민은행",
  jansoeAccount: "",
  balconyBank: "국민은행",
  balconyAccount: "101437-04-002570",
  optionBank: "국민은행",
  optionAccount: "101437-04-002567",
  guaranteeBank: "국민은행",
  guaranteeAccount: "959137-01-010205",
  mgmtBank: "",
  mgmtAccount: "",
  movingBank: "국민은행",
  movingAccount: "554001-01-454810",
  fundsBank: "",
  fundsAccount: "",
};

interface ReportRow {
  // internal
  id: string;
  // 기본정보
  seq: number;
  type: string;
  dong: string;
  ho: string;
  contractor: string;
  residentNo: string;
  phone: string;
  loanBank: string;
  branch: string;
  branchManager: string;
  branchPhone: string;
  branchFax: string;
  // 실행
  executionDate: string;
  // 대출금액
  loanAmount: number;
  additionalLoan: number;
  // 중도금
  intermediateBank: string;
  intermediatePrincipal: number;
  intermediateInterest: number;
  intermediateTotal: number;
  // 분양잔금
  jansoeAccount: string;
  jansoePrincipal: number;
  jansoeInterest: number;
  jansoeTotal: number;
  // 발코니
  balconyBank: string;
  balconyAccount: string;
  balconyAmount: number;
  // 유상옵션
  optionBank: string;
  optionAccount: string;
  optionAmount: number;
  // 보증수수료
  guaranteeBank: string;
  guaranteeAccount: string;
  surrogateInterest: number;
  // 관리비
  mgmtBank: string;
  mgmtAccount: string;
  preMgmtFee: number;
  // 이주비
  movingBank: string;
  movingAccount: string;
  movingFee: number;
  // 필요자금
  fundsBank: string;
  fundsAccount: string;
  requiredFunds: number;
  // 인지대
  stampDutyLoan: number;
  stampDutyAdditional: number;
  // 필요자금 (인지대 적용)
  requiredFundsWithStamp: number;
  // 비고
  note: string;
  internalNote: string;
  intermediateContact: string;
  moveInDate: string;
}

type ColAlign = "right" | "left" | "center";
interface ColDef {
  key: keyof ReportRow;
  label: string;
  width: number; // Excel wch
  px: number; // CSS pixel width
  align?: ColAlign;
}
interface SectionGroup {
  title: string;
  fill: string;
  cols: ColDef[];
}

const SECTIONS: SectionGroup[] = [
  {
    title: "기본정보",
    fill: "DDEBF7",
    cols: [
      { key: "seq", label: "순번", align: "center", width: 5, px: 42 },
      { key: "type", label: "타입", align: "center", width: 6, px: 48 },
      { key: "dong", label: "동", align: "center", width: 5, px: 40 },
      { key: "ho", label: "호", align: "center", width: 6, px: 50 },
      { key: "contractor", label: "계약자", align: "center", width: 11, px: 78 },
      { key: "residentNo", label: "주민번호", align: "center", width: 16, px: 110 },
      { key: "phone", label: "연락처", align: "center", width: 14, px: 100 },
      { key: "loanBank", label: "대출은행", align: "center", width: 10, px: 72 },
      { key: "branch", label: "지점", align: "center", width: 9, px: 64 },
      { key: "branchManager", label: "담당자", align: "center", width: 12, px: 88 },
      { key: "branchPhone", label: "전화", align: "center", width: 13, px: 96 },
      { key: "branchFax", label: "팩스", align: "center", width: 13, px: 96 },
    ],
  },
  {
    title: "실행",
    fill: "FFF2CC",
    cols: [{ key: "executionDate", label: "실행일", align: "center", width: 9, px: 70 }],
  },
  {
    title: "대출금액",
    fill: "FCE4D6",
    cols: [
      { key: "loanAmount", label: "대출금액", align: "right", width: 14, px: 110 },
      { key: "additionalLoan", label: "추가대출", align: "right", width: 12, px: 90 },
    ],
  },
  {
    title: "중도금",
    fill: "E2EFDA",
    cols: [
      { key: "intermediateBank", label: "중도금은행", align: "center", width: 10, px: 78 },
      { key: "intermediatePrincipal", label: "중도금원금", align: "right", width: 14, px: 110 },
      { key: "intermediateInterest", label: "이자", align: "right", width: 11, px: 88 },
      { key: "intermediateTotal", label: "중도금합계", align: "right", width: 14, px: 110 },
    ],
  },
  {
    title: "분양잔금",
    fill: "DDEBF7",
    cols: [
      { key: "jansoeAccount", label: "상환계좌", align: "center", width: 16, px: 120 },
      { key: "jansoePrincipal", label: "잔금원금", align: "right", width: 14, px: 110 },
      { key: "jansoeInterest", label: "잔금이자", align: "right", width: 11, px: 88 },
      { key: "jansoeTotal", label: "잔금합계", align: "right", width: 14, px: 110 },
    ],
  },
  {
    title: "발코니",
    fill: "FFF2CC",
    cols: [
      { key: "balconyBank", label: "은행", align: "center", width: 9, px: 70 },
      { key: "balconyAccount", label: "상환계좌", align: "center", width: 16, px: 120 },
      { key: "balconyAmount", label: "발코니", align: "right", width: 12, px: 96 },
    ],
  },
  {
    title: "유상옵션",
    fill: "FCE4D6",
    cols: [
      { key: "optionBank", label: "은행", align: "center", width: 9, px: 70 },
      { key: "optionAccount", label: "상환계좌", align: "center", width: 16, px: 120 },
      { key: "optionAmount", label: "옵션", align: "right", width: 11, px: 88 },
    ],
  },
  {
    title: "보증수수료",
    fill: "E2EFDA",
    cols: [
      { key: "guaranteeBank", label: "은행", align: "center", width: 9, px: 70 },
      { key: "guaranteeAccount", label: "상환계좌", align: "center", width: 16, px: 120 },
      { key: "surrogateInterest", label: "대납이자", align: "right", width: 12, px: 96 },
    ],
  },
  {
    title: "관리비",
    fill: "FFF2CC",
    cols: [
      { key: "mgmtBank", label: "은행", align: "center", width: 9, px: 70 },
      { key: "mgmtAccount", label: "상환계좌", align: "center", width: 16, px: 120 },
      { key: "preMgmtFee", label: "선수관리비", align: "right", width: 12, px: 96 },
    ],
  },
  {
    title: "이주비",
    fill: "FCE4D6",
    cols: [
      { key: "movingBank", label: "은행", align: "center", width: 9, px: 70 },
      { key: "movingAccount", label: "상환계좌", align: "center", width: 16, px: 120 },
      { key: "movingFee", label: "이주비", align: "right", width: 11, px: 88 },
    ],
  },
  {
    title: "필요자금",
    fill: "EDEDED",
    cols: [
      { key: "fundsBank", label: "은행", align: "center", width: 9, px: 70 },
      { key: "fundsAccount", label: "계좌번호", align: "center", width: 16, px: 120 },
      { key: "requiredFunds", label: "필요자금", align: "right", width: 14, px: 110 },
    ],
  },
  {
    title: "인지대",
    fill: "DDEBF7",
    cols: [
      { key: "stampDutyLoan", label: "대출", align: "right", width: 9, px: 70 },
      { key: "stampDutyAdditional", label: "추가대출", align: "right", width: 9, px: 70 },
    ],
  },
  {
    title: "필요자금 (인지대 적용)",
    fill: "FCE4D6",
    cols: [
      { key: "requiredFundsWithStamp", label: "(인지대 적용)", align: "right", width: 16, px: 120 },
    ],
  },
  {
    title: "메모",
    fill: "F2F2F2",
    cols: [
      { key: "note", label: "비고", align: "left", width: 28, px: 200 },
      { key: "internalNote", label: "우리 메모", align: "left", width: 22, px: 160 },
      { key: "intermediateContact", label: "중도금 신협 연락처", align: "center", width: 18, px: 130 },
      { key: "moveInDate", label: "이사일", align: "center", width: 10, px: 70 },
    ],
  },
];

const FLAT_COLS = SECTIONS.flatMap((s) => s.cols);

// 순번, 타입, 동, 호, 계약자 — 5개만 좌측 고정
const STICKY_COUNT = 5;
const STICKY_LEFTS: number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < STICKY_COUNT; i++) {
    out.push(acc);
    acc += FLAT_COLS[i].px;
  }
  return out;
})();
const TABLE_TOTAL_WIDTH = FLAT_COLS.reduce((s, c) => s + c.px, 0);

function parseAddress(label?: string): { complex: string; dong: string; ho: string } {
  if (!label) return { complex: "", dong: "", ho: "" };
  const parts = label.split("·").map((s) => s.trim());
  const dh = parts[0] ?? "";
  const complex = parts[1] ?? "";
  const [dong = "", ho = ""] = dh.split("-");
  return { complex, dong, ho };
}

function parseExecDate(s?: string): string {
  if (!s) return "";
  const iso = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return `${parseInt(iso[1], 10)}/${parseInt(iso[2], 10)}`;
  const m = s.match(/(\d+)월\s*(\d+)일/);
  if (m) return `${m[1]}/${m[2]}`;
  return s;
}

function toRow(t: TaskItem, idx: number): ReportRow {
  const { dong, ho } = parseAddress(t.addressLabel);
  const intermediatePrincipal = t.intermediatePrincipal ?? 0;
  const intermediateInterest = t.intermediateInterest ?? 0;
  const intermediateTotal = intermediatePrincipal + intermediateInterest;
  const jansoePrincipal = t.shortfallPrincipal ?? 0;
  const jansoeInterest = t.shortfallInterest ?? 0;
  const jansoeTotal = jansoePrincipal + jansoeInterest;
  const balconyAmount = t.balconyAmount ?? 0;
  const optionAmount = t.optionAmount ?? 0;
  const surrogateInterest = t.surrogateInterest ?? 0;
  const preMgmtFee = t.preMgmtFee ?? 0;
  const movingFee = t.movingFee ?? 0;
  const loanAmount = t.loanAmount ?? 0;
  const additionalLoan = t.additionalLoan ?? 0;
  // 필요자금 = 대출금액 + 추가대출 - (잔금합계 + 중도금합계 + 발코니 + 옵션 + 대납이자 + 선수관리비 + 이주비)
  const requiredFunds =
    loanAmount + additionalLoan -
    (jansoeTotal + intermediateTotal + balconyAmount + optionAmount + surrogateInterest + preMgmtFee + movingFee);
  const stampDutyLoan = t.stampDutyLoan ?? (loanAmount > 0 ? 75000 : 0);
  const stampDutyAdditional = t.stampDutyAdditional ?? 0;
  const requiredFundsWithStamp = requiredFunds - stampDutyLoan - stampDutyAdditional;

  return {
    id: t.id,
    seq: idx + 1,
    type: t.size ? `${t.size}` : "",
    dong,
    ho,
    contractor: t.borrower ?? t.customerName,
    residentNo: t.residentNo ?? "",
    phone: t.phones?.[0] ?? t.phone ?? "",
    loanBank: BANK.loanBank,
    branch: BANK.branch,
    branchManager: BANK.branchManager,
    branchPhone: BANK.branchPhone,
    branchFax: BANK.branchFax,
    executionDate: parseExecDate(t.executionDate),
    loanAmount,
    additionalLoan,
    intermediateBank: BANK.intermediateBank,
    intermediatePrincipal,
    intermediateInterest,
    intermediateTotal,
    jansoeAccount: BANK.jansoeAccount,
    jansoePrincipal,
    jansoeInterest,
    jansoeTotal,
    balconyBank: balconyAmount > 0 ? BANK.balconyBank : "",
    balconyAccount: balconyAmount > 0 ? BANK.balconyAccount : "",
    balconyAmount,
    optionBank: optionAmount > 0 ? BANK.optionBank : "",
    optionAccount: optionAmount > 0 ? BANK.optionAccount : "",
    optionAmount,
    guaranteeBank: surrogateInterest > 0 ? BANK.guaranteeBank : "",
    guaranteeAccount: surrogateInterest > 0 ? BANK.guaranteeAccount : "",
    surrogateInterest,
    mgmtBank: preMgmtFee > 0 ? BANK.mgmtBank : "",
    mgmtAccount: preMgmtFee > 0 ? BANK.mgmtAccount : "",
    preMgmtFee,
    movingBank: movingFee > 0 ? BANK.movingBank : "",
    movingAccount: movingFee > 0 ? BANK.movingAccount : "",
    movingFee,
    fundsBank: BANK.fundsBank,
    fundsAccount: BANK.fundsAccount,
    requiredFunds,
    stampDutyLoan,
    stampDutyAdditional,
    requiredFundsWithStamp,
    note: t.note ?? "",
    internalNote: t.internalNote ?? "",
    intermediateContact: t.intermediateContact ?? "",
    moveInDate: t.moveInDate ?? "",
  };
}

const fmt = (v: unknown, align?: ColAlign) => {
  if (align === "right") {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return "-";
    return n.toLocaleString("ko-KR");
  }
  return v == null || v === "" ? "" : String(v);
};

export function IntegratedReportModal({
  items,
  complex,
  onClose,
  onRowClick,
}: {
  items: TaskItem[];
  complex: string;
  onClose: () => void;
  onRowClick?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => items.map(toRow), [items]);

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
    const totalCols = FLAT_COLS.length;
    const titleRow: (string | number)[] = new Array(totalCols).fill("");
    titleRow[0] = `${complex} 상환조회`;

    const sectionRow: (string | number)[] = [];
    SECTIONS.forEach((sec) => {
      sectionRow.push(sec.title);
      for (let i = 1; i < sec.cols.length; i++) sectionRow.push("");
    });

    const colHeaderRow: (string | number)[] = FLAT_COLS.map((c) => c.label);

    const bodyRows: (string | number)[][] = rows.map((r) =>
      FLAT_COLS.map((c) => {
        const v = r[c.key];
        return c.align === "right" ? Number(v) || 0 : (v as string | number);
      })
    );

    const aoa: (string | number)[][] = [titleRow, sectionRow, colHeaderRow, ...bodyRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const border = {
      top: { style: "thin", color: { rgb: "999999" } },
      bottom: { style: "thin", color: { rgb: "999999" } },
      left: { style: "thin", color: { rgb: "999999" } },
      right: { style: "thin", color: { rgb: "999999" } },
    };
    const baseFont = { name: "맑은 고딕", sz: 10 };
    const centerAlign = { horizontal: "center", vertical: "center", wrapText: true };

    // Title row
    for (let c = 0; c < totalCols; c++) {
      const refStr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[refStr]) ws[refStr] = { t: "s", v: titleRow[c] ?? "" };
      ws[refStr].s = {
        font: { ...baseFont, bold: true, sz: 14 },
        alignment: centerAlign,
        fill: { fgColor: { rgb: "FFFFFF" } },
      };
    }

    // Section header row + collect merges
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    ];
    let cursor = 0;
    SECTIONS.forEach((sec) => {
      const start = cursor;
      const end = cursor + sec.cols.length - 1;
      for (let c = start; c <= end; c++) {
        const refStr = XLSX.utils.encode_cell({ r: 1, c });
        if (!ws[refStr]) ws[refStr] = { t: "s", v: c === start ? sec.title : "" };
        ws[refStr].s = {
          font: { ...baseFont, bold: true, sz: 11 },
          alignment: centerAlign,
          fill: { fgColor: { rgb: sec.fill } },
          border,
        };
      }
      if (end > start) {
        merges.push({ s: { r: 1, c: start }, e: { r: 1, c: end } });
      }
      cursor = end + 1;
    });

    // Column header row
    for (let c = 0; c < totalCols; c++) {
      const refStr = XLSX.utils.encode_cell({ r: 2, c });
      if (!ws[refStr]) ws[refStr] = { t: "s", v: colHeaderRow[c] ?? "" };
      ws[refStr].s = {
        font: { ...baseFont, bold: true },
        alignment: centerAlign,
        fill: { fgColor: { rgb: "F2F2F2" } },
        border,
      };
    }

    // Body rows
    bodyRows.forEach((row, rIdx) => {
      const r = rIdx + 3;
      FLAT_COLS.forEach((col, c) => {
        const refStr = XLSX.utils.encode_cell({ r, c });
        if (!ws[refStr]) ws[refStr] = { t: "s", v: row[c] ?? "" };
        if (col.align === "right") {
          const n = Number(row[c]) || 0;
          ws[refStr].t = "n";
          ws[refStr].v = n;
          ws[refStr].z = "#,##0";
          ws[refStr].s = {
            font: baseFont,
            alignment: { horizontal: "right", vertical: "center" },
            numFmt: "#,##0",
            border,
          };
        } else {
          ws[refStr].s = {
            font: baseFont,
            alignment: { horizontal: col.align ?? "center", vertical: "center", wrapText: true },
            border,
          };
        }
      });
    });

    ws["!cols"] = FLAT_COLS.map((c) => ({ wch: c.width }));
    ws["!rows"] = [{ hpt: 28 }, { hpt: 22 }, { hpt: 24 }, ...bodyRows.map(() => ({ hpt: 22 }))];
    ws["!merges"] = merges;
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: bodyRows.length + 2, c: totalCols - 1 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "통합보고서");
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `${complex}_상환조회_${stamp}.xlsx`);
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
        aria-label="상환조회"
        style={{
          width: "min(1640px, 100%)",
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
            background: "var(--v4-bg-primary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
                color: "var(--v4-text-primary)",
              }}
            >
              {complex} 상환조회
            </h2>
            <span
              className="v4-tabular"
              style={{ fontSize: 12, color: "var(--v4-text-tertiary)" }}
            >
              총 {rows.length}건 · {FLAT_COLS.length}개 항목
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
              표시할 항목이 없습니다.
            </div>
          ) : (
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 11,
                tableLayout: "fixed",
                width: TABLE_TOTAL_WIDTH,
              }}
            >
              <colgroup>
                {FLAT_COLS.map((c) => (
                  <col key={c.key} style={{ width: c.px, minWidth: c.px }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {SECTIONS.flatMap((sec, secIdx) => {
                    const isFirstSection = secIdx === 0;
                    if (isFirstSection && sec.cols.length > STICKY_COUNT) {
                      // 첫 섹션(기본정보)은 고정 부분과 스크롤 부분으로 분리
                      const stickyCount = STICKY_COUNT;
                      const restCount = sec.cols.length - stickyCount;
                      return [
                        <th
                          key={`${sec.title}-sticky`}
                          colSpan={stickyCount}
                          style={{
                            padding: "8px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--v4-text-primary)",
                            background: `#${sec.fill}`,
                            borderBottom: "1px solid var(--v4-border-tertiary)",
                            borderRight: "1px solid var(--v4-border-tertiary)",
                            textAlign: "center",
                            position: "sticky",
                            top: 0,
                            left: 0,
                            zIndex: 5,
                            whiteSpace: "nowrap",
                            boxShadow: "2px 0 4px -2px rgba(0,0,0,0.12)",
                          }}
                        >
                          {sec.title}
                        </th>,
                        <th
                          key={`${sec.title}-rest`}
                          colSpan={restCount}
                          style={{
                            padding: "8px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--v4-text-primary)",
                            background: `#${sec.fill}`,
                            borderBottom: "1px solid var(--v4-border-tertiary)",
                            borderRight: "1px solid var(--v4-border-tertiary)",
                            textAlign: "center",
                            position: "sticky",
                            top: 0,
                            zIndex: 3,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {""}
                        </th>,
                      ];
                    }
                    return [
                      <th
                        key={sec.title}
                        colSpan={sec.cols.length}
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--v4-text-primary)",
                          background: `#${sec.fill}`,
                          borderBottom: "1px solid var(--v4-border-tertiary)",
                          borderRight: "1px solid var(--v4-border-tertiary)",
                          textAlign: "center",
                          position: "sticky",
                          top: 0,
                          zIndex: 3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sec.title}
                      </th>,
                    ];
                  })}
                </tr>
                <tr>
                  {FLAT_COLS.map((c, idx) => {
                    const isSticky = idx < STICKY_COUNT;
                    const isLastSticky = idx === STICKY_COUNT - 1;
                    return (
                      <th
                        key={c.key}
                        style={{
                          padding: "6px 8px",
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: "var(--v4-text-secondary)",
                          background: "var(--v4-bg-secondary)",
                          borderBottom: "1px solid var(--v4-border-tertiary)",
                          borderRight: "1px solid var(--v4-border-tertiary)",
                          textAlign: "center",
                          position: "sticky",
                          top: 33,
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
                {rows.map((r, idx) => {
                  const clickable = !!onRowClick;
                  return (
                  <tr
                    key={r.id ?? idx}
                    onClick={
                      clickable ? () => onRowClick!(r.id) : undefined
                    }
                    className={clickable ? "v4-clrow" : undefined}
                    style={{ cursor: clickable ? "pointer" : undefined }}
                  >
                    {FLAT_COLS.map((c, cIdx) => {
                      const display = fmt(r[c.key], c.align);
                      const isNegative =
                        c.align === "right" && Number(r[c.key]) < 0;
                      const isSticky = cIdx < STICKY_COUNT;
                      return (
                        <td
                          key={c.key}
                          className={c.align === "right" ? "v4-tabular" : undefined}
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid var(--v4-border-tertiary)",
                            borderRight: "1px solid var(--v4-border-tertiary)",
                            color: isNegative
                              ? "var(--v4-danger)"
                              : "var(--v4-text-primary)",
                            textAlign: c.align ?? "center",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            boxSizing: "border-box",
                            background: isSticky
                              ? "var(--v4-bg-primary)"
                              : undefined,
                            position: isSticky ? "sticky" : undefined,
                            left: isSticky ? STICKY_LEFTS[cIdx] : undefined,
                            zIndex: isSticky ? 1 : undefined,
                            boxShadow:
                              isSticky && cIdx === STICKY_COUNT - 1
                                ? "2px 0 4px -2px rgba(0,0,0,0.12)"
                                : undefined,
                          }}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <style>{`
          .v4-clrow:hover td {
            filter: brightness(0.96);
          }
        `}</style>
      </div>
    </div>
  );
}
