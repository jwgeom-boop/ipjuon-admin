import * as XLSX from "xlsx-js-style";
import type { TaskItem } from "../home/TaskRow";
import { getConsultationFixture } from "../wizard/consultationFixtures";
import { getSigningFixture } from "../wizard/signingFixtures";
import { getExecutionFixture } from "../wizard/executionFixtures";

const BORDER = {
  top: { style: "thin", color: { rgb: "C7CDD6" } },
  bottom: { style: "thin", color: { rgb: "C7CDD6" } },
  left: { style: "thin", color: { rgb: "C7CDD6" } },
  right: { style: "thin", color: { rgb: "C7CDD6" } },
} as const;

const baseFont = { name: "맑은 고딕", sz: 10 };
const boldFont = { ...baseFont, bold: true };
const titleFont = { ...baseFont, sz: 14, bold: true };

const STICKY_FILL = { fgColor: { rgb: "F1F4F9" } };
const GROUP_FILLS: Record<string, { fgColor: { rgb: string } }> = {
  상담: { fgColor: { rgb: "EAF2FB" } },
  예약: { fgColor: { rgb: "FFF6E5" } },
  자서: { fgColor: { rgb: "FFF6E5" } },
  실행: { fgColor: { rgb: "E6F4EA" } },
  상환: { fgColor: { rgb: "F4F5F7" } },
};

type Group = { label: string; cols: { key: string; header: string; numeric?: boolean }[] };

const STICKY: { key: string; header: string }[] = [
  { key: "complex", header: "아파트" },
  { key: "dongHo", header: "동호수" },
  { key: "name", header: "계약자" },
  { key: "phone", header: "전화" },
];

const GROUPS: Group[] = [
  {
    label: "상담",
    cols: [
      { key: "intakeDate", header: "상담일" },
      { key: "tag", header: "태그" },
      { key: "assignee", header: "담당자" },
    ],
  },
  {
    label: "예약",
    cols: [
      { key: "scheduledSigning", header: "예약일" },
      { key: "nextStep", header: "다음" },
    ],
  },
  {
    label: "자서",
    cols: [
      { key: "signingDate", header: "자서일" },
      { key: "signingTime", header: "시간" },
      { key: "signingLocation", header: "장소" },
    ],
  },
  {
    label: "실행",
    cols: [
      { key: "executionDate", header: "실행일" },
      { key: "loanAmount", header: "대출금", numeric: true },
      { key: "remark", header: "비고" },
    ],
  },
  {
    label: "상환",
    cols: [
      { key: "middlePrincipal", header: "중도금 원금", numeric: true },
      { key: "middleInterest", header: "중도금 이자", numeric: true },
      { key: "balancePrincipal", header: "잔금 원금", numeric: true },
      { key: "balanceInterest", header: "잔금 이자", numeric: true },
      { key: "balcony", header: "발코니", numeric: true },
      { key: "options", header: "옵션", numeric: true },
      { key: "guaranteeFee", header: "보증료", numeric: true },
      { key: "mgmtFee", header: "관리비", numeric: true },
      { key: "movingAllowance", header: "이사비", numeric: true },
      { key: "stampDuty", header: "인지세", numeric: true },
      { key: "stampDutyAdditional", header: "추가 인지세", numeric: true },
      { key: "additionalLoan", header: "추가 대출", numeric: true },
    ],
  },
];

const groupHeaderCell = (label: string) => ({
  v: label,
  s: {
    font: { ...boldFont, sz: 11 },
    fill: GROUP_FILLS[label] ?? STICKY_FILL,
    alignment: { vertical: "center", horizontal: "center" },
    border: BORDER,
  },
});

const colHeaderCell = (label: string, numeric?: boolean) => ({
  v: label,
  s: {
    font: { ...boldFont, color: { rgb: "5A6675" } },
    fill: STICKY_FILL,
    alignment: { vertical: "center", horizontal: numeric ? "right" : "left", indent: numeric ? 0 : 1 },
    border: BORDER,
  },
});

const textCell = (v: string, opts: { bold?: boolean } = {}) => ({
  v: v ?? "",
  t: "s",
  s: {
    font: opts.bold ? boldFont : baseFont,
    alignment: { vertical: "center", horizontal: "left", indent: 1 },
    border: BORDER,
  },
});

const moneyCellNum = (n: number) => ({
  v: n || 0,
  t: "n",
  z: "#,##0",
  s: {
    font: baseFont,
    alignment: { vertical: "center", horizontal: "right", indent: 1 },
    border: BORDER,
  },
});

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

function splitAddress(label?: string): { dongHo: string; complex: string } {
  if (!label) return { dongHo: "", complex: "" };
  const parts = label.split(/\s*·\s*/);
  return { dongHo: parts[0]?.trim() ?? "", complex: parts[1]?.trim() ?? "" };
}

function valueFor(
  task: TaskItem,
  c: ReturnType<typeof getConsultationFixture> | null,
  s: ReturnType<typeof getSigningFixture> | null,
  e: ReturnType<typeof getExecutionFixture> | null,
  key: string,
): string | number {
  switch (key) {
    case "intakeDate":
      return c?.intakeDate ?? "";
    case "tag":
      return task.tag ?? "";
    case "assignee":
      return task.assignee ?? "";
    case "scheduledSigning":
      return c?.scheduledSigningDate ?? "";
    case "nextStep":
      return c?.nextStep ?? "";
    case "signingDate":
      return s?.signingDate ?? "";
    case "signingTime":
      return s?.signingTime ?? "";
    case "signingLocation":
      return s?.signingLocation ?? "";
    case "executionDate":
      return task.executionDate ?? e?.executionDate ?? "";
    case "loanAmount":
      return e?.loanAmount ?? 0;
    case "remark":
      return e?.remark ?? "";
    case "middlePrincipal":
      return e?.middlePrincipal ?? 0;
    case "middleInterest":
      return e?.middleInterest ?? 0;
    case "balancePrincipal":
      return e?.balancePrincipal ?? 0;
    case "balanceInterest":
      return e?.balanceInterest ?? 0;
    case "balcony":
      return e?.balcony ?? 0;
    case "options":
      return e?.options ?? 0;
    case "guaranteeFee":
      return e?.guaranteeFee ?? 0;
    case "mgmtFee":
      return e?.mgmtFee ?? 0;
    case "movingAllowance":
      return e?.movingAllowance ?? 0;
    case "stampDuty":
      return e?.stampDuty ?? 0;
    case "stampDutyAdditional":
      return e?.stampDutyAdditional ?? 0;
    case "additionalLoan":
      return e?.additionalLoan ?? 0;
    default:
      return "";
  }
}

export function exportPipelineToExcel(items: TaskItem[], scopeLabel: string) {
  const aoa: any[][] = [];

  const totalCols = STICKY.length + GROUPS.reduce((s, g) => s + g.cols.length, 0);

  // Title row
  const titleRow: any[] = new Array(totalCols).fill(null);
  titleRow[0] = {
    v: `전체 진행현황 — ${scopeLabel}`,
    s: {
      font: titleFont,
      alignment: { vertical: "center", horizontal: "left", indent: 1 },
    },
  };
  titleRow[totalCols - 1] = {
    v: `${items.length}건 · ${new Date().toLocaleDateString("ko-KR")}`,
    s: {
      font: { ...baseFont, color: { rgb: "5A6675" } },
      alignment: { vertical: "center", horizontal: "right", indent: 1 },
    },
  };
  aoa.push(titleRow);
  aoa.push(new Array(totalCols).fill(null)); // spacer

  // Group header row (row 2)
  const groupRow: any[] = [];
  groupRow.push(groupHeaderCell("고객"));
  for (let i = 1; i < STICKY.length; i++) groupRow.push(null);
  for (const g of GROUPS) {
    groupRow.push(groupHeaderCell(g.label));
    for (let i = 1; i < g.cols.length; i++) groupRow.push(null);
  }
  aoa.push(groupRow);

  // Column header row (row 3)
  const colRow: any[] = [];
  STICKY.forEach((c) => colRow.push(colHeaderCell(c.header)));
  GROUPS.forEach((g) => g.cols.forEach((c) => colRow.push(colHeaderCell(c.header, c.numeric))));
  aoa.push(colRow);

  // Data rows
  items.forEach((t) => {
    const { dongHo, complex } = splitAddress(t.addressLabel);
    const { c, s, e } = pickFixtures(t.id);
    const row: any[] = [];
    row.push(textCell(complex));
    row.push(textCell(dongHo));
    row.push(textCell(t.customerName, { bold: true }));
    row.push(textCell(t.phone ?? ""));
    GROUPS.forEach((g) => {
      g.cols.forEach((col) => {
        const v = valueFor(t, c, s, e, col.key);
        if (col.numeric) {
          row.push(moneyCellNum(typeof v === "number" ? v : 0));
        } else {
          row.push(textCell(typeof v === "string" ? v : String(v)));
        }
      });
    });
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges for group header row (row index 2, 0-based)
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, totalCols - 2) } }, // title
    { s: { r: 2, c: 0 }, e: { r: 2, c: STICKY.length - 1 } }, // 고객 group header
  ];
  let cursor = STICKY.length;
  GROUPS.forEach((g) => {
    if (g.cols.length > 1) {
      merges.push({ s: { r: 2, c: cursor }, e: { r: 2, c: cursor + g.cols.length - 1 } });
    }
    cursor += g.cols.length;
  });
  ws["!merges"] = merges;

  // Column widths
  const cols: { wch: number }[] = [];
  STICKY.forEach((c) => {
    if (c.key === "complex") cols.push({ wch: 22 });
    else if (c.key === "dongHo") cols.push({ wch: 10 });
    else if (c.key === "name") cols.push({ wch: 12 });
    else if (c.key === "phone") cols.push({ wch: 16 });
  });
  GROUPS.forEach((g) =>
    g.cols.forEach((c) => {
      if (c.key === "signingLocation" || c.key === "remark") cols.push({ wch: 28 });
      else if (c.numeric) cols.push({ wch: 14 });
      else cols.push({ wch: 12 });
    }),
  );
  ws["!cols"] = cols;

  // Freeze sticky cols + header rows (3 rows: title + spacer + group + col = freeze at row 4)
  ws["!freeze"] = { xSplit: STICKY.length, ySplit: 4 } as any;
  (ws as any)["!views"] = [{ state: "frozen", xSplit: STICKY.length, ySplit: 4 }];

  // Row heights
  const rows: { hpt?: number }[] = [];
  rows[0] = { hpt: 26 }; // title
  rows[2] = { hpt: 22 }; // group header
  ws["!rows"] = rows;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "전체 진행현황");

  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const safeScope = scopeLabel.replace(/[\\/:*?"<>|]/g, "_");
  const filename = `전체진행현황_${safeScope}_${stamp}.xlsx`;

  XLSX.writeFile(wb, filename);
}
