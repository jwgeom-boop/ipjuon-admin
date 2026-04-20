import { format } from "date-fns";

export type RequestKind = "balance" | "interim";

interface Props {
  kind: RequestKind;
  bankName: string;
  complexFullName: string;
  bankManager: string;
  bankPhone: string;
  bankFax: string;
  rows: Array<{
    resident_name?: string;
    resident_no?: string;
    dong?: string;
    ho?: string;
    resident_phone?: string;
    execution_date?: string | null;
    loan_amount?: number | null;
  }>;
}

export default function RequestDocPrint({
  kind,
  bankName,
  complexFullName,
  bankManager,
  bankPhone,
  bankFax,
  rows,
}: Props) {
  const title = kind === "balance" ? "잔금조회 요청서" : "중도금조회 요청서";
  const today = format(new Date(), "yyyy-MM-dd");
  const headAccent = kind === "balance" ? "#92D050" : "#F3C6BF";

  const cols =
    kind === "balance"
      ? ["순번", "고객명", "주민등록번호", "동", "호수", "연락처", "대출일자", "후불이자", "잔금"]
      : ["순번", "고객명", "주민등록번호", "동", "호수", "연락처", "대출일자", "중도금", "중도금이자", "합계"];

  return (
    <div className="print-root" style={{ background: "white", color: "black", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .print-root table { border-collapse: collapse; width: 100%; }
        .print-root th, .print-root td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; text-align: center; }
        .print-root th { background: #D9E1F2; font-weight: bold; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", marginBottom: 12 }}>
        <div style={{ border: "2px solid #333", background: "#D9E1F2", padding: "12px 20px", fontWeight: "bold", fontSize: 16, display: "flex", alignItems: "center" }}>
          {bankName}
        </div>
        <div style={{ flex: 1, marginLeft: 12, border: "2px solid #333", background: headAccent, padding: "12px 20px", textAlign: "center", fontWeight: "bold", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {complexFullName} {title}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
        <div>📅 {today}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <span>담당: <strong>{bankManager || "-"}</strong></span>
          <span>HP: {bankPhone || "-"}</span>
          {kind === "interim" && <span>FAX: {bankFax || "-"}</span>}
        </div>
      </div>

      <table>
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ padding: 20 }}>선택된 고객이 없습니다.</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.resident_name || ""}</td>
              <td>{r.resident_no || ""}</td>
              <td>{r.dong || ""}</td>
              <td>{r.ho || ""}</td>
              <td>{r.resident_phone || ""}</td>
              <td>{r.execution_date ? format(new Date(r.execution_date), "M월 d일") : ""}</td>
              {kind === "balance" ? (
                <>
                  <td>{/* 후불이자 - 수기 기입 */}</td>
                  <td>{/* 잔금 - 수기 기입 */}</td>
                </>
              ) : (
                <>
                  <td>{/* 중도금 - 수기 */}</td>
                  <td>{/* 중도금이자 - 수기 */}</td>
                  <td>{/* 합계 - 수기 */}</td>
                </>
              )}
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 15 - rows.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td>{rows.length + i + 1}</td>
              {cols.slice(1).map((_, j) => <td key={j}>&nbsp;</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="no-print" style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "8px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          🖨 인쇄 / PDF 저장
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding: "8px 20px", background: "#e5e7eb", color: "#111", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
