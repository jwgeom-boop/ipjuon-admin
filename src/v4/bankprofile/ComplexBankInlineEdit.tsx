import { useEffect, useState } from "react";
import { X, Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Profile {
  id?: string;
  complex_name: string;
  bank_name?: string;
  branch_name?: string;
  greeting?: string;
  products?: string;
  business_hours?: string;
  notice?: string;
  is_closed: boolean;
  closing_message?: string;
  contact_phone?: string;
  contact_email?: string;
}

/**
 * 헤더에서 [✏️ 단지 정보 편집] 클릭 시 페이지 이동 없이 떠오르는 인라인 모달.
 * 현재 선택된 단지와 본인 은행 조합의 ComplexBankProfile 을 즉시 편집.
 * - 데이터 있으면 PUT (수정), 없으면 POST (신규)
 * - 저장 시 모달 닫고 토스트
 */
export function ComplexBankInlineEdit({
  complexName, onClose, onSaved,
}: {
  complexName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [data, setData] = useState<Profile>({
    complex_name: complexName,
    is_closed: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list: Profile[] = await api.getMyComplexBankProfiles();
        const found = list.find((p) => p.complex_name === complexName);
        if (found) {
          setData(found);
          setExistingId(found.id ?? null);
        } else {
          setData({ complex_name: complexName, is_closed: false });
          setExistingId(null);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "조회 실패");
      }
      setLoading(false);
    })();

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [complexName, onClose]);

  const set = (k: keyof Profile) => (e: any) =>
    setData((d) => ({ ...d, [k]: e.target?.value ?? e }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existingId) {
        await api.updateMyComplexBankProfile(existingId, data);
      } else {
        await api.createMyComplexBankProfile(data);
      }
      toast.success("저장되었습니다", { description: "입주민 앱에 즉시 반영됩니다" });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "저장 실패");
    }
    setSaving(false);
  };

  return (
    <div role="dialog" aria-modal="true" style={overlayStyle}
         onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <header style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={16} strokeWidth={1.8} style={{ color: "var(--v4-info)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                [{complexName}] {data.bank_name ? `· ${data.bank_name}` : ""} 안내글
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                {existingId ? "기존 정보 수정 — 입주민 앱에 즉시 반영" : "신규 등록 — 단지별 맞춤 안내글 입력"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={iconBtnStyle}><X size={14} /></button>
        </header>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--v4-text-tertiary)", fontSize: 13 }}>
            불러오는 중...
          </div>
        ) : (
          <div style={bodyStyle}>
            <Field label="지점명">
              <input value={data.branch_name ?? ""} onChange={set("branch_name")}
                placeholder="잠실지점, 부전동지점 등" style={inputStyle} />
            </Field>

            <Field label="인사말">
              <textarea rows={3} value={data.greeting ?? ""} onChange={set("greeting")}
                placeholder="예: 하나은행 자이더테라스파크 전담입니다. 친절하고 신속한 상담 약속드립니다."
                style={textareaStyle} />
            </Field>

            <Field label="취급 상품">
              <textarea rows={6} value={data.products ?? ""} onChange={set("products")}
                placeholder={`▣ 정부 정책대출\n  · 디딤돌대출\n  · 보금자리론\n  · 신생아 특례 디딤돌대출\n\n▣ 자체 상품\n  · 잔금대출 (고정/변동)\n  · 신혼·다자녀 우대`}
                style={textareaStyle} />
            </Field>

            <Two>
              <Field label="영업시간">
                <input value={data.business_hours ?? ""} onChange={set("business_hours")}
                  placeholder="평일 09:00~18:00" style={inputStyle} />
              </Field>
              <Field label="대표 연락처">
                <input value={data.contact_phone ?? ""} onChange={set("contact_phone")}
                  placeholder="02-1599-1111" style={inputStyle} />
              </Field>
            </Two>

            <Field label="공지 (선택)">
              <textarea rows={2} value={data.notice ?? ""} onChange={set("notice")}
                placeholder="예: 5/1~5/5 연휴 기간 상담 일시 중단" style={textareaStyle} />
            </Field>

            <div style={{ borderTop: "1px solid var(--v4-border-tertiary)", paddingTop: 12 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={!!data.is_closed}
                  onChange={(e) => setData((d) => ({ ...d, is_closed: e.target.checked }))} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {data.is_closed ? "🔴 이 단지에서 모집 마감" : "🟢 이 단지에서 모집 중"}
                </span>
              </label>
              {data.is_closed && (
                <input value={data.closing_message ?? ""} onChange={set("closing_message")}
                  placeholder="예: 이 단지 차수 모집 마감 — 다음 차수 안내 예정"
                  style={{ ...inputStyle, marginTop: 8 }} />
              )}
            </div>
          </div>
        )}

        <footer style={footerStyle}>
          <button onClick={onClose} style={secondaryBtnStyle}>취소</button>
          <button onClick={handleSave} disabled={saving || loading} style={primaryBtnStyle(saving || loading)}>
            <Save size={13} strokeWidth={1.8} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--v4-text-tertiary)" }}>{label}</span>
      {children}
    </label>
  );
}

function Two({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalStyle: React.CSSProperties = { width: "min(560px, 100%)", maxHeight: "calc(100vh - 32px)", background: "var(--v4-bg-primary)", borderRadius: "var(--v4-radius-lg)", border: "1px solid var(--v4-border-secondary)", boxShadow: "0 24px 48px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" };
const headerStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--v4-border-tertiary)" };
const bodyStyle: React.CSSProperties = { padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" };
const footerStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--v4-border-tertiary)", background: "var(--v4-bg-secondary)", borderBottomLeftRadius: "var(--v4-radius-lg)", borderBottomRightRadius: "var(--v4-radius-lg)" };
const iconBtnStyle: React.CSSProperties = { width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--v4-border-tertiary)", borderRadius: 6, background: "var(--v4-bg-primary)", cursor: "pointer", color: "var(--v4-text-secondary)" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", color: "var(--v4-text-primary)", background: "var(--v4-bg-primary)", border: "1px solid var(--v4-border-secondary)", borderRadius: 6, boxSizing: "border-box" };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", minHeight: 60, lineHeight: 1.5 };
const secondaryBtnStyle: React.CSSProperties = { padding: "7px 14px", fontSize: 12, fontWeight: 500, color: "var(--v4-text-secondary)", background: "var(--v4-bg-primary)", border: "1px solid var(--v4-border-tertiary)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" };
const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "#fff",
  background: disabled ? "var(--v4-text-tertiary)" : "var(--v4-info)",
  border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
});
