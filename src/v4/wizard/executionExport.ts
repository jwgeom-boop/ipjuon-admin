import * as XLSX from "xlsx-js-style";
import type { ExecutionData } from "./executionFixtures";

const fmt = (n: number) => (n ? n.toLocaleString("ko-KR") : "");

interface RowDef {
  label: string;
  bankKey: keyof ExecutionData;
  accountKey: keyof ExecutionData;
  amountKey: keyof ExecutionData;
  note?: string;
}

const ROWS: RowDef[] = [
  { label: "중도금", bankKey: "middleBank", accountKey: "middleAccount", amountKey: "middlePrincipal", note: "원금" },
  { label: "중도금이자", bankKey: "middleInterestBank", accountKey: "middleInterestAccount", amountKey: "middleInterest", note: "실행일확인" },
  { label: "분양잔금", bankKey: "balanceBank", accountKey: "balanceAccount", amountKey: "balancePrincipal", note: "시행사 입금" },
  { label: "발코니 확장", bankKey: "balconyBank", accountKey: "balconyAccount", amountKey: "balcony", note: "별매품1" },
  { label: "유상옵션", bankKey: "optionsBank", accountKey: "optionsAccount", amountKey: "options", note: "별매품2" },
  { label: "보증수수료", bankKey: "guaranteeFeeBank", accountKey: "guaranteeFeeAccount", amountKey: "guaranteeFee", note: "HUG/HF 대납이자" },
  { label: "선수관리비", bankKey: "mgmtFeeBank", accountKey: "mgmtFeeAccount", amountKey: "mgmtFee", note: "관리사무소" },
  { label: "이주비", bankKey: "movingAllowanceBank", accountKey: "movingAllowanceAccount", amountKey: "movingAllowance" },
  { label: "인지대", bankKey: "stampDutyBank", accountKey: "stampDutyAccount", amountKey: "stampDuty", note: "수입인지" },
  { label: "인지대 (추가대출)", bankKey: "stampDutyAdditionalBank", accountKey: "stampDutyAdditionalAccount", amountKey: "stampDutyAdditional" },
];

const BORDER = {
  top: { style: "thin", color: { rgb: "C7CDD6" } },
  bottom: { style: "thin", color: { rgb: "C7CDD6" } },
  left: { style: "thin", color: { rgb: "C7CDD6" } },
  right: { style: "thin", color: { rgb: "C7CDD6" } },
} as const;

const HEADER_FILL = { fgColor: { rgb: "F1F4F9" } };
const SECTION_FILL = { fgColor: { rgb: "E8EEF6" } };

const baseFont = { name: "맑은 고딕", sz: 10 };
const boldFont = { ...baseFont, bold: true };
const titleFont = { ...baseFont, sz: 14, bold: true };
const moneyFont = { ...baseFont, sz: 11, bold: true };

const labelCell = (v: string) => ({
  v,
  s: {
    font: { ...baseFont, color: { rgb: "5A6675" } },
    fill: HEADER_FILL,
    alignment: { vertical: "center", horizontal: "left", indent: 1 },
    border: BORDER,
  },
});

const valueCell = (v: string | number, opts: { bold?: boolean; align?: "left" | "right" | "center"; numfmt?: string } = {}) => ({
  v,
  t: typeof v === "number" ? "n" : "s",
  z: opts.numfmt,
  s: {
    font: opts.bold ? boldFont : baseFont,
    alignment: { vertical: "center", horizontal: opts.align ?? "left", indent: opts.align === "right" ? 0 : 1 },
    border: BORDER,
  },
});

const sectionHeader = (v: string) => ({
  v,
  s: {
    font: { ...boldFont, color: { rgb: "1F2937" } },
    fill: SECTION_FILL,
    alignment: { vertical: "center", horizontal: "left", indent: 1 },
    border: BORDER,
  },
});

const tableHeader = (v: string, align: "left" | "right" | "center" = "left") => ({
  v,
  s: {
    font: { ...boldFont, color: { rgb: "5A6675" } },
    fill: HEADER_FILL,
    alignment: { vertical: "center", horizontal: align },
    border: BORDER,
  },
});

const moneyCell = (n: number, opts: { highlight?: "danger" | "success"; bold?: boolean } = {}) => {
  const fill = opts.highlight === "danger" ? { fgColor: { rgb: "FDECEC" } } : opts.highlight === "success" ? { fgColor: { rgb: "E6F4EA" } } : undefined;
  const color = opts.highlight === "danger" ? { rgb: "C62828" } : opts.highlight === "success" ? { rgb: "1E7B37" } : { rgb: "1F2937" };
  return {
    v: n,
    t: "n",
    z: "#,##0",
    s: {
      font: { ...(opts.bold ? moneyFont : baseFont), color },
      ...(fill ? { fill } : {}),
      alignment: { vertical: "center", horizontal: "right", indent: 1 },
      border: BORDER,
    },
  };
};

export function exportExecutionToExcel(data: ExecutionData) {
  const middleTotal = (data.middlePrincipal ?? 0) + (data.middleInterest ?? 0);
  const balanceTotal = (data.balancePrincipal ?? 0) + (data.balanceInterest ?? 0);
  const othersTotal =
    (data.balcony ?? 0) +
    (data.options ?? 0) +
    (data.guaranteeFee ?? 0) +
    (data.mgmtFee ?? 0) +
    (data.movingAllowance ?? 0) +
    (data.stampDuty ?? 0) +
    (data.stampDutyAdditional ?? 0);
  const totalRepayment = middleTotal + balanceTotal + othersTotal;
  const totalLoan = (data.loanAmount ?? 0) + (data.additionalLoan ?? 0);
  const required = totalRepayment - totalLoan;
  const requiredTone: "danger" | "success" | undefined =
    required > 0 ? "danger" : required < 0 ? "success" : undefined;
  const requiredLabel = required > 0 ? "입금요청" : required < 0 ? "환급" : "정산 완료";

  const aoa: any[][] = [];

  // Title row (merged across 5 cols)
  aoa.push([
    {
      v: `${data.complex}  상환조회`,
      s: {
        font: titleFont,
        alignment: { vertical: "center", horizontal: "left", indent: 1 },
      },
    },
    null,
    null,
    null,
    {
      v: data.dDay,
      s: {
        font: { ...boldFont, color: { rgb: "C62828" } },
        alignment: { vertical: "center", horizontal: "right", indent: 1 },
      },
    },
  ]);
  aoa.push([null, null, null, null, null]); // spacer

  // 수신 — 담당 은행
  aoa.push([sectionHeader("수신 — 담당 은행"), null, null, null, null]);
  aoa.push([
    labelCell("은행"),
    valueCell(`${data.middleBank || "—"} ${data.bankBranch}`.trim(), { bold: true }),
    labelCell("담당자"),
    valueCell(data.bankContact, { bold: true }),
    null,
  ]);
  aoa.push([
    labelCell("전화"),
    valueCell(data.bankPhone),
    labelCell("팩스"),
    valueCell(data.bankFax),
    null,
  ]);

  // 입주자 지원 연락처
  aoa.push([sectionHeader("입주자 지원 연락처"), null, null, null, null]);
  aoa.push([
    labelCell("입주지원센터 전화"),
    valueCell(data.supportCenterPhone),
    labelCell("팩스"),
    valueCell(data.supportCenterFax),
    null,
  ]);
  aoa.push([
    labelCell("잔금조회 전화"),
    valueCell(data.balanceInquiryPhone),
    labelCell("팩스"),
    valueCell(data.balanceInquiryFax),
    null,
  ]);

  // 계약자 / 대출 정보
  aoa.push([sectionHeader("계약자 정보"), null, sectionHeader("대출 정보"), null, null]);
  aoa.push([
    labelCell("계약자"),
    valueCell(data.customerName, { bold: true }),
    labelCell("대출금액"),
    moneyCell(data.loanAmount ?? 0),
    null,
  ]);
  aoa.push([
    labelCell("연락처"),
    valueCell(data.phone),
    labelCell("추가대출"),
    moneyCell(data.additionalLoan ?? 0),
    null,
  ]);
  aoa.push([
    labelCell("동호수"),
    valueCell(data.dongHo),
    labelCell("실행일"),
    valueCell(data.executionDate),
    null,
  ]);

  // 필요자금 banner
  aoa.push([
    {
      v: "필요자금",
      s: {
        font: { ...boldFont, sz: 12, color: requiredTone === "danger" ? { rgb: "C62828" } : requiredTone === "success" ? { rgb: "1E7B37" } : { rgb: "1F2937" } },
        fill: requiredTone === "danger" ? { fgColor: { rgb: "FDECEC" } } : requiredTone === "success" ? { fgColor: { rgb: "E6F4EA" } } : HEADER_FILL,
        alignment: { vertical: "center", horizontal: "left", indent: 1 },
        border: BORDER,
      },
    },
    null,
    null,
    moneyCell(Math.abs(required), { highlight: requiredTone, bold: true }),
    {
      v: requiredLabel,
      s: {
        font: { ...boldFont, color: { rgb: "FFFFFF" } },
        fill: requiredTone === "danger" ? { fgColor: { rgb: "C62828" } } : requiredTone === "success" ? { fgColor: { rgb: "1E7B37" } } : { fgColor: { rgb: "5A6675" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: BORDER,
      },
    },
  ]);

  // Settlement table header
  aoa.push([
    tableHeader("구분"),
    tableHeader("해당은행"),
    tableHeader("계좌번호"),
    tableHeader("금액", "right"),
    tableHeader("비고"),
  ]);

  ROWS.forEach((r) => {
    const amount = (data[r.amountKey] as number) ?? 0;
    aoa.push([
      valueCell(r.label, { bold: true }),
      valueCell((data[r.bankKey] as string) ?? ""),
      valueCell((data[r.accountKey] as string) ?? ""),
      moneyCell(amount),
      valueCell(r.note ?? ""),
    ]);
  });

  // Totals row
  aoa.push([
    {
      v: "상환 총액",
      s: {
        font: { ...boldFont, sz: 11 },
        fill: SECTION_FILL,
        alignment: { vertical: "center", horizontal: "left", indent: 1 },
        border: BORDER,
      },
    },
    {
      v: "",
      s: { fill: SECTION_FILL, border: BORDER },
    },
    {
      v: "",
      s: { fill: SECTION_FILL, border: BORDER },
    },
    {
      v: totalRepayment,
      t: "n",
      z: "#,##0",
      s: {
        font: { ...moneyFont, sz: 12 },
        fill: SECTION_FILL,
        alignment: { vertical: "center", horizontal: "right", indent: 1 },
        border: BORDER,
      },
    },
    {
      v: `대출 ${fmt(totalLoan)} · 차액 ${fmt(required)}`,
      s: {
        font: { ...baseFont, color: { rgb: "5A6675" } },
        fill: SECTION_FILL,
        alignment: { vertical: "center", horizontal: "left", indent: 1 },
        border: BORDER,
      },
    },
  ]);

  // Remark
  aoa.push([
    labelCell("비 고"),
    {
      v: data.remark || "",
      s: {
        font: baseFont,
        alignment: { vertical: "center", horizontal: "left", wrapText: true, indent: 1 },
        border: BORDER,
      },
    },
    null,
    null,
    null,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // 수신 header
    { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }, // 입주자 지원 header
    { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } }, // 계약자 header
    { s: { r: 8, c: 2 }, e: { r: 8, c: 4 } }, // 대출 header
    { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } }, // 필요자금 label
    // 상환 총액 row: rows index = 14 (header) + ROWS.length, label spans 0..2 already split
  ];
  // Find totals row index: title(0) + spacer(1) + 수신(2) + 2 rows(3,4) + 입주자(5) + 2(6,7) + section(8) + 3(9,10,11) + banner(12) + table header(13) + ROWS.length rows + totals at 14+ROWS.length
  const totalsRowIdx = 13 + 1 + ROWS.length; // 0-based
  merges.push({ s: { r: totalsRowIdx, c: 0 }, e: { r: totalsRowIdx, c: 2 } });
  // Remark row: totalsRowIdx + 1, span cols 1..4
  const remarkRowIdx = totalsRowIdx + 1;
  merges.push({ s: { r: remarkRowIdx, c: 1 }, e: { r: remarkRowIdx, c: 4 } });
  ws["!merges"] = merges;

  // Column widths
  ws["!cols"] = [
    { wch: 16 }, // 구분
    { wch: 18 }, // 해당은행
    { wch: 30 }, // 계좌번호
    { wch: 18 }, // 금액
    { wch: 22 }, // 비고
  ];

  // Row heights
  const rows: { hpt?: number }[] = [];
  rows[0] = { hpt: 26 }; // title
  rows[12] = { hpt: 26 }; // 필요자금 banner
  rows[totalsRowIdx] = { hpt: 24 };
  rows[remarkRowIdx] = { hpt: 36 };
  ws["!rows"] = rows;

  // Print setup — A4 portrait, fit width
  ws["!pageSetup"] = { paperSize: 9, orientation: "portrait", fitToWidth: 1, fitToHeight: 0 } as any;
  ws["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } as any;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "상환조회");

  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const safeName = (data.customerName || "고객").replace(/[\\/:*?"<>|]/g, "");
  const safeDong = (data.dongHo || "").replace(/[\\/:*?"<>|]/g, "");
  const filename = `상환조회_${safeName}_${safeDong}_${stamp}.xlsx`;

  XLSX.writeFile(wb, filename);
}
