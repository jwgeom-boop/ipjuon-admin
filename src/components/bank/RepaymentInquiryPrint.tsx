// 상환조회 (repayment inquiry) — per-resident document sent to bank
// Layout follows the 봄여름가을겨울3차 template
import { useEffect, useState } from "react";

export interface RepaymentRow {
  resident_name?: string;
  resident_no?: string;
  dong?: string | number;
  ho?: string | number;
  resident_phone?: string;
  execution_date?: string | null;
  loan_amount?: number | null;
  approved_amount?: number | null;
  additional_loan_amount?: number | null;
  // 정산 항목
  settle_middle_principal?: number | null;
  settle_middle_interest?: number | null;
  settle_middle_account?: string | null;
  settle_middle_bank?: string | null;
  settle_balance_principal?: number | null;
  settle_balance_interest?: number | null;
  settle_balance_account?: string | null;
  settle_balcony?: number | null;
  settle_options?: number | null;
  settle_stamp_duty?: number | null;
  settle_stamp_duty_additional?: number | null;
  settle_mgmt_fee?: number | null;
  settle_mgmt_account?: string | null;
  contractor?: string | null;
  special_notes?: string | null;
}

interface SenderInfo {
  lawFirm: string;
  lawFirmTel: string;
  lawFirmFax: string;
  supportCenterTel: string;
  balanceInquiryTel: string;
  balanceInquiryFax: string;
  footerNote: string;
}

interface Props {
  complexFullName: string;
  bankName: string;
  bankBranch: string;
  bankManager: string;
  bankPhone: string;
  bankFax: string;
  rows: RepaymentRow[];
}

const fmt = (v?: number | null) =>
  v === 0 || v == null ? "-" : Number(v).toLocaleString("ko-KR");

const SENDER_STORAGE_KEY = "bank_repayment_sender_info";

const DEFAULT_SENDER: SenderInfo = {
  lawFirm: "",
  lawFirmTel: "",
  lawFirmFax: "",
  supportCenterTel: "",
  balanceInquiryTel: "",
  balanceInquiryFax: "",
  footerNote: "당일 12시 이전에 입금 예정",
};

export default function RepaymentInquiryPrint({
  complexFullName, bankName, bankBranch, bankManager, bankPhone, bankFax, rows,
}: Props) {
  const [sender, setSender] = useState<SenderInfo>(DEFAULT_SENDER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SENDER_STORAGE_KEY);
      if (saved) setSender({ ...DEFAULT_SENDER, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const updateSender = (patch: Partial<SenderInfo>) => {
    const next = { ...sender, ...patch };
    setSender(next);
    try { localStorage.setItem(SENDER_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <div className="print-root" style={{ background: "white", color: "black", padding: 20, fontFamily: "'Malgun Gothic', Arial, sans-serif" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .sheet { page-break-after: always; }
          .sheet:last-child { page-break-after: auto; }
          input.inline { border: none !important; background: transparent !important; }
        }
        .print-root table { border-collapse: collapse; width: 100%; }
        .print-root th, .print-root td { border: 1px solid #333; padding: 6px 8px; font-size: 12.5px; text-align: center; vertical-align: middle; }
        .print-root th { background: #D9E1F2; font-weight: 600; }
        .print-root td.label { background: #D9E1F2; font-weight: 600; }
        .print-root td.highlight { background: #FBE5D6; }
        input.inline {
          border: 1px dashed #bbb; background: #fffef5; padding: 2px 4px; font: inherit;
          color: inherit; width: 100%; text-align: center;
        }
      `}</style>

      {/* 공용 발신/수신 편집 패널 (인쇄 제외) */}
      <div className="no-print" style={{ marginBottom: 16, padding: 12, background: "#f7fafc", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>발신/지원센터 정보 (저장되어 다음 인쇄에도 사용됩니다)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          <label>법무사사무소명<input value={sender.lawFirm} onChange={e => updateSender({ lawFirm: e.target.value })} style={inpSt} /></label>
          <label>법무사 전화<input value={sender.lawFirmTel} onChange={e => updateSender({ lawFirmTel: e.target.value })} style={inpSt} /></label>
          <label>법무사 팩스<input value={sender.lawFirmFax} onChange={e => updateSender({ lawFirmFax: e.target.value })} style={inpSt} /></label>
          <label>입주지원센터 전화<input value={sender.supportCenterTel} onChange={e => updateSender({ supportCenterTel: e.target.value })} style={inpSt} /></label>
          <label>잔금조회 전화<input value={sender.balanceInquiryTel} onChange={e => updateSender({ balanceInquiryTel: e.target.value })} style={inpSt} /></label>
          <label>잔금조회 팩스<input value={sender.balanceInquiryFax} onChange={e => updateSender({ balanceInquiryFax: e.target.value })} style={inpSt} /></label>
          <label style={{ gridColumn: "span 2" }}>하단 비고 문구<input value={sender.footerNote} onChange={e => updateSender({ footerNote: e.target.value })} style={inpSt} /></label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>선택된 고객이 없습니다.</div>
      ) : rows.map((r, idx) => (
        <div key={idx} className="sheet" style={{ marginBottom: 24 }}>
          {/* 제목 + 수신/입주지원센터 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                {complexFullName}　　상환조회
              </div>
              <table>
                <tbody>
                  <tr>
                    <td className="label" style={{ width: 60 }}>수신</td>
                    <td style={{ width: 110 }}>{bankName || "-"}</td>
                    <td style={{ width: 80 }}>{bankBranch || "-"}</td>
                    <td>{bankManager || "-"}</td>
                  </tr>
                  <tr>
                    <td className="label">전화</td>
                    <td>{bankPhone || "-"}</td>
                    <td className="label">팩스</td>
                    <td>{bankFax || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <table>
                <thead>
                  <tr><th></th><th style={{ width: 110 }}>전화</th><th style={{ width: 110 }}>팩스</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="label">입주지원센터</td>
                    <td colSpan={2}>{sender.supportCenterTel || "-"}</td>
                  </tr>
                  <tr>
                    <td className="label">잔금조회</td>
                    <td>{sender.balanceInquiryTel || "-"}</td>
                    <td>{sender.balanceInquiryFax || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 발신 */}
          <div style={{ fontSize: 13, marginBottom: 2 }}>
            발신 : <strong>{sender.lawFirm || "-"}</strong>
          </div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            전화 : {sender.lawFirmTel || "-"} , 팩스 : {sender.lawFirmFax || "-"}
          </div>

          {/* 계약자 / 대출 정보 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <table>
              <tbody>
                <tr>
                  <td className="label" style={{ width: 80 }}>계약자</td>
                  <td className="highlight" style={{ width: 100 }}>{r.resident_name || "-"}</td>
                  <td className="label" style={{ width: 80 }}>주민번호</td>
                  <td className="highlight">{r.resident_no || "-"}</td>
                </tr>
                <tr>
                  <td className="label">동호수</td>
                  <td className="highlight">{[r.dong, r.ho].filter(Boolean).join("-") || "-"}</td>
                  <td className="label">연락처</td>
                  <td className="highlight">{r.resident_phone || "-"}</td>
                </tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr>
                  <td className="label">대출금액</td>
                  <td className="label">대출실행일</td>
                </tr>
                <tr>
                  <td className="highlight">{fmt(r.approved_amount ?? r.loan_amount)}</td>
                  <td className="highlight">{r.execution_date || "-"}</td>
                </tr>
                <tr>
                  <td className="highlight">{fmt(r.additional_loan_amount)}</td>
                  <td className="label">추가대출</td>
                </tr>
                <tr>
                  <td className="label">필요자금</td>
                  <td className="highlight" style={{ color: "#c00", fontWeight: 700 }}>
                    {(() => {
                      const A =
                        (r.settle_middle_principal || 0) + (r.settle_middle_interest || 0) +
                        (r.settle_balance_principal || 0) + (r.settle_balance_interest || 0) +
                        (r.settle_balcony || 0) + (r.settle_options || 0) +
                        (r.settle_mgmt_fee || 0) + (r.settle_stamp_duty || 0) + (r.settle_stamp_duty_additional || 0);
                      const B = (r.loan_amount || 0) + (r.additional_loan_amount || 0);
                      const need = B - A;
                      return need === 0 ? "-" : need.toLocaleString("ko-KR");
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 정산 항목 */}
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }}>구분</th>
                <th style={{ width: 130 }}>해당은행</th>
                <th>계좌번호</th>
                <th style={{ width: 140 }}>금액</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label">중도금</td>
                <td className="highlight">{r.settle_middle_bank || bankName || "-"}</td>
                <td>{r.settle_middle_account || "수표상환"}</td>
                <td style={{ textAlign: "right" }}>{fmt((r.settle_middle_principal || 0) + (r.settle_middle_interest || 0))}</td>
                <td>{r.settle_middle_bank ? `${r.settle_middle_bank}` : ""}</td>
              </tr>
              <tr>
                <td className="label">분양잔금</td>
                <td className="highlight">{bankName || "-"}</td>
                <td>{r.settle_balance_account || "-"}</td>
                <td style={{ textAlign: "right" }}>{fmt((r.settle_balance_principal || 0) + (r.settle_balance_interest || 0))}</td>
                <td>{r.contractor || ""}</td>
              </tr>
              <tr>
                <td className="label">별매품1</td>
                <td className="highlight">{bankName || "-"}</td>
                <td>-</td>
                <td style={{ textAlign: "right" }}>{fmt(r.settle_balcony)}</td>
                <td>{r.contractor || ""}</td>
              </tr>
              <tr>
                <td className="label">별매품2</td>
                <td className="highlight">{bankName || "-"}</td>
                <td>-</td>
                <td style={{ textAlign: "right" }}>{fmt(r.settle_options)}</td>
                <td>{r.contractor || ""}</td>
              </tr>
              <tr>
                <td className="label">인지대</td>
                <td className="highlight"></td>
                <td></td>
                <td style={{ textAlign: "right" }}>{fmt(r.settle_stamp_duty)}</td>
                <td></td>
              </tr>
              <tr>
                <td className="label">인지대(추가대출)</td>
                <td className="highlight"></td>
                <td></td>
                <td style={{ textAlign: "right" }}>{fmt(r.settle_stamp_duty_additional)}</td>
                <td></td>
              </tr>
              <tr>
                <td className="label">선수관리비</td>
                <td className="highlight">{bankName || "-"}</td>
                <td>{r.settle_mgmt_account || "-"}</td>
                <td style={{ textAlign: "right" }}>{fmt(r.settle_mgmt_fee)}</td>
                <td>{complexFullName}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: 12, marginTop: 6 }}>
            ※ 잔금,발코니,옵션 납부시 동호수또는 이름 기재요망
          </div>

          <table style={{ marginTop: 4 }}>
            <tbody>
              <tr>
                <td className="label" style={{ width: 80 }}>비　고</td>
                <td style={{ textAlign: "left", paddingLeft: 12 }}>
                  {r.special_notes || sender.footerNote}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="no-print" style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
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

const inpSt: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 2, padding: "4px 6px",
  border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12,
};
