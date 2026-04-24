import { useMemo } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import type { TaskItem } from "./TaskRow";
import { ModalShell, ModalHeader, modalActionButtonStyle } from "../shared/ModalShell";

interface SigningRow {
  id: string;
  apt: string;
  signingDate: string;
  dong: string;
  ho: string;
  contractor: string;
  loanAmount: number;
  executionDate: string;
  repayment: string;
  phone1: string;
  phone2: string;
  borrower: string;
  note: string;
}

const SIGNING_PLACE = "국민은행 2층";

const COL_DEFS: { key: keyof SigningRow; label: string; width: string; align?: "right" | "left" | "center" }[] = [
  { key: "apt", label: "아파트", width: "12%" },
  { key: "signingDate", label: "자서일", width: "9%" },
  { key: "dong", label: "동", width: "4%", align: "center" },
  { key: "ho", label: "호수", width: "5%", align: "center" },
  { key: "contractor", label: "계약자", width: "7%" },
  { key: "loanAmount", label: "대출금액", width: "9%", align: "right" },
  { key: "executionDate", label: "대출실행일", width: "7%" },
  { key: "repayment", label: "상환방식", width: "9%" },
  { key: "phone1", label: "연락처1", width: "8%" },
  { key: "phone2", label: "연락처2", width: "8%" },
  { key: "borrower", label: "차주", width: "6%" },
  { key: "note", label: "비고", width: "16%" },
];

function parseAddress(label?: string): { complex: string; dong: string; ho: string } {
  if (!label) return { complex: "", dong: "", ho: "" };
  const parts = label.split("·").map((s) => s.trim());
  const dh = parts[0] ?? "";
  const complex = parts[1] ?? "";
  const [dong = "", ho = ""] = dh.split("-");
  return { complex, dong, ho };
}

function formatExecDateKR(s?: string): string {
  if (!s) return "";
  const iso = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return `${parseInt(iso[1], 10)}월 ${parseInt(iso[2], 10)}일`;
  return s;
}

function toRow(t: TaskItem): SigningRow {
  const { complex, dong, ho } = parseAddress(t.addressLabel);
  const phones = t.phones ?? [];
  return {
    id: t.id,
    apt: complex,
    signingDate: t.signingDateLabel ?? t.time ?? "",
    dong,
    ho,
    contractor: t.customerName,
    loanAmount: t.loanAmount ?? 0,
    executionDate: formatExecDateKR(t.executionDate),
    repayment: t.repayment ?? "",
    phone1: phones[0] ?? "",
    phone2: phones[1] ?? "",
    borrower: t.borrower ?? t.customerName,
    note: t.note ?? "",
  };
}

const formatWon = (n: number) => (n > 0 ? n.toLocaleString("ko-KR") : "-");

export function SigningListModal({
  items,
  onClose,
  onRowClick,
}: {
  items: TaskItem[];
  onClose: () => void;
  onRowClick?: (id: string) => void;
}) {
  const rows = useMemo(() => items.map(toRow), [items]);
  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + (r.loanAmount || 0), 0),
    [rows]
  );

  const handleDownload = () => {
    const headerRow = [
      "아파트", "자서일", "동", "호수", "계약자",
      "대출금액", "대출실행일", "상환방식", "연락처1", "연락처2", "차주", "비고",
    ];
    const bodyRows = rows.map((r) => [
      r.apt, r.signingDate, r.dong, r.ho, r.contractor,
      r.loanAmount, r.executionDate, r.repayment,
      r.phone1, r.phone2, r.borrower, r.note,
    ]);
    const footerRow = [
      "", "자서장소", SIGNING_PLACE, "", "합계", totalAmount,
      "", "", "", "", "", "",
    ];
    const aoa: (string | number)[][] = [headerRow, ...bodyRows, [], footerRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const border = {
      top: { style: "thin", color: { rgb: "999999" } },
      bottom: { style: "thin", color: { rgb: "999999" } },
      left: { style: "thin", color: { rgb: "999999" } },
      right: { style: "thin", color: { rgb: "999999" } },
    };
    const baseFont = { name: "맑은 고딕", sz: 11 };
    const centerAlign = {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    };

    const headerStyle = {
      font: { ...baseFont, bold: true, sz: 11 },
      alignment: centerAlign,
      fill: { fgColor: { rgb: "FCE4D6" } },
      border,
    };
    const bodyStyle = {
      font: baseFont,
      alignment: centerAlign,
      border,
    };
    const moneyStyle = {
      font: baseFont,
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0",
      border,
    };
    const footerLabelStyle = {
      font: { ...baseFont, bold: true },
      alignment: centerAlign,
      fill: { fgColor: { rgb: "F2F2F2" } },
      border,
    };
    const footerValueStyle = {
      font: baseFont,
      alignment: centerAlign,
      border,
    };
    const footerMoneyStyle = {
      font: { ...baseFont, bold: true },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0",
      fill: { fgColor: { rgb: "F2F2F2" } },
      border,
    };

    const headerLen = headerRow.length;
    // header row (r=0)
    for (let c = 0; c < headerLen; c++) {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: headerRow[c] };
      ws[ref].s = headerStyle;
    }
    // body rows
    bodyRows.forEach((row, rIdx) => {
      const r = rIdx + 1;
      for (let c = 0; c < headerLen; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: "s", v: row[c] ?? "" };
        if (c === 5) {
          ws[ref].s = moneyStyle;
          ws[ref].t = "n";
          ws[ref].z = "#,##0";
        } else {
          ws[ref].s = bodyStyle;
        }
      }
    });
    // footer row (after blank row)
    const footerRowIdx = bodyRows.length + 2;
    for (let c = 0; c < headerLen; c++) {
      const ref = XLSX.utils.encode_cell({ r: footerRowIdx, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: footerRow[c] ?? "" };
      if (c === 1 || c === 4) {
        ws[ref].s = footerLabelStyle;
      } else if (c === 2) {
        ws[ref].s = footerValueStyle;
      } else if (c === 5) {
        ws[ref].s = footerMoneyStyle;
        ws[ref].t = "n";
        ws[ref].z = "#,##0";
      }
    }

    ws["!cols"] = [
      { wch: 24 }, { wch: 24 }, { wch: 6 }, { wch: 8 }, { wch: 16 },
      { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 24 },
    ];
    ws["!rows"] = [
      { hpt: 26 },
      ...bodyRows.map(() => ({ hpt: 26 })),
      { hpt: 8 },
      { hpt: 26 },
    ];
    ws["!merges"] = [
      { s: { r: footerRowIdx, c: 2 }, e: { r: footerRowIdx, c: 3 } },
    ];
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: footerRowIdx, c: headerLen - 1 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "자서예약");
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    XLSX.writeFile(wb, `자서예약_${stamp}.xlsx`);
  };

  return (
    <ModalShell size="M" ariaLabel="자서예약 명단" onClose={onClose}>
      <ModalHeader
        title="자서예약 명단"
        badge={`총 ${rows.length}건`}
        onClose={onClose}
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
              자서예약 건이 없습니다.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 12,
              }}
            >
              <colgroup>
                {COL_DEFS.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COL_DEFS.map((c) => (
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
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
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
                    {COL_DEFS.map((c) => {
                      const raw = r[c.key];
                      const display =
                        c.key === "loanAmount"
                          ? formatWon(raw as number)
                          : (raw as string) || "-";
                      const isTabular =
                        c.key === "loanAmount" ||
                        c.key === "phone1" ||
                        c.key === "phone2";
                      return (
                        <td
                          key={c.key}
                          className={isTabular ? "v4-tabular" : undefined}
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid var(--v4-border-tertiary)",
                            borderRight: "1px solid var(--v4-border-tertiary)",
                            color: "var(--v4-text-primary)",
                            textAlign: c.align ?? "left",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
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
              <tfoot>
                <tr style={{ height: 12 }}>
                  <td colSpan={COL_DEFS.length} style={{ background: "var(--v4-bg-primary)" }} />
                </tr>
                <tr>
                  <td
                    style={{
                      borderRight: "1px solid var(--v4-border-tertiary)",
                      background: "var(--v4-bg-primary)",
                    }}
                  />
                  <td
                    style={{
                      padding: "9px 10px",
                      fontSize: 12,
                      textAlign: "center",
                      fontWeight: 600,
                      color: "var(--v4-text-secondary)",
                      background: "var(--v4-bg-secondary)",
                      border: "1px solid var(--v4-border-tertiary)",
                    }}
                  >
                    자서장소
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      padding: "9px 10px",
                      fontSize: 12,
                      textAlign: "center",
                      color: "var(--v4-text-primary)",
                      border: "1px solid var(--v4-border-tertiary)",
                    }}
                  >
                    {SIGNING_PLACE}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      fontSize: 12,
                      textAlign: "center",
                      fontWeight: 600,
                      color: "var(--v4-text-secondary)",
                      background: "var(--v4-bg-secondary)",
                      border: "1px solid var(--v4-border-tertiary)",
                    }}
                  >
                    합계
                  </td>
                  <td
                    className="v4-tabular"
                    style={{
                      padding: "9px 12px",
                      fontSize: 12.5,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--v4-text-primary)",
                      border: "1px solid var(--v4-border-tertiary)",
                    }}
                  >
                    {formatWon(totalAmount)}
                  </td>
                  <td colSpan={COL_DEFS.length - 6} style={{ background: "var(--v4-bg-primary)" }} />
                </tr>
              </tfoot>
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
