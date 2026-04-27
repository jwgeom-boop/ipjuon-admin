import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import { api } from "@/lib/api";
import { DEFAULT_COMPLEXES } from "../data/samples";

interface ComplexBankProfile {
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
  updated_by?: string;
  updated_at?: string;
}

const EMPTY: ComplexBankProfile = {
  complex_name: "",
  is_closed: false,
};

export default function ComplexBankProfileList() {
  const navigate = useNavigate();
  const [list, setList] = useState<ComplexBankProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ComplexBankProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComplexBankProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await api.getMyComplexBankProfiles();
      setList(data ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "조회 실패");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") navigate("/v4"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const handleSave = async (form: ComplexBankProfile) => {
    if (!form.complex_name?.trim()) {
      toast.error("단지명을 선택해 주세요");
      return;
    }
    setSaving(true);
    try {
      if (form.id) await api.updateMyComplexBankProfile(form.id, form);
      else await api.createMyComplexBankProfile(form);
      toast.success("저장되었습니다");
      setEditTarget(null);
      fetchList();
    } catch (e: any) {
      toast.error(e?.message ?? "저장 실패");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await api.deleteMyComplexBankProfile(deleteTarget.id);
      toast.success("삭제되었습니다");
      setDeleteTarget(null);
      fetchList();
    } catch (e: any) {
      toast.error(e?.message ?? "삭제 실패");
    }
  };

  const myBankName = list[0]?.bank_name ?? "본인 은행";

  return (
    <div className="v4-root" style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => navigate("/v4/bank-profile")} style={backBtnStyle}>
          <ArrowLeft size={13} strokeWidth={1.8} />
          은행 프로필 (글로벌)
          <Kbd>ESC</Kbd>
        </button>
        <button onClick={() => setEditTarget({ ...EMPTY })} style={primaryBtnStyle}>
          <Plus size={13} strokeWidth={1.8} />
          단지 추가
        </button>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Building2 size={22} strokeWidth={1.6} style={{ color: "var(--v4-info)" }} />
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {myBankName} · 단지별 프로필
          </h1>
        </div>
        <p style={{ fontSize: 12, color: "var(--v4-text-tertiary)", marginBottom: 24, lineHeight: 1.6 }}>
          입주민 앱에서 <strong>단지별로 다른 지점·인사글·영업시간</strong>이 표시됩니다.
          단지별 데이터가 없으면 [은행 프로필 (글로벌)] 데이터가 fallback 으로 사용됩니다.
        </p>

        {loading && <p style={{ color: "var(--v4-text-tertiary)", fontSize: 13 }}>불러오는 중...</p>}

        {!loading && list.length === 0 && (
          <div style={emptyBoxStyle}>
            <p style={{ fontSize: 13, color: "var(--v4-text-secondary)", margin: 0 }}>
              아직 단지별 프로필이 없습니다.
            </p>
            <p style={{ fontSize: 11, color: "var(--v4-text-tertiary)", marginTop: 6 }}>
              [+ 단지 추가] 버튼으로 단지별 인사말·취급상품·지점·영업시간을 등록하세요.
              <br />
              등록 전엔 글로벌 프로필이 모든 단지에 동일하게 표시됩니다.
            </p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((p) => (
              <article key={p.id} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--v4-text-primary)", margin: 0 }}>
                        {p.complex_name}
                      </h3>
                      {p.branch_name && (
                        <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>· {p.branch_name}</span>
                      )}
                      {p.is_closed && (
                        <span style={closedBadgeStyle}>
                          <AlertCircle size={10} strokeWidth={2} />
                          마감
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--v4-text-tertiary)", margin: 0, lineHeight: 1.5 }}>
                      {p.business_hours ?? "영업시간 미입력"}
                      {p.contact_phone ? ` · ☎ ${p.contact_phone}` : ""}
                    </p>
                    {p.greeting && (
                      <p style={{ fontSize: 11, color: "var(--v4-text-secondary)", margin: "4px 0 0", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                        {p.greeting}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setEditTarget(p)} style={ghostBtnStyle}>
                      <Pencil size={12} /> 수정
                    </button>
                    <button onClick={() => setDeleteTarget(p)} style={{ ...ghostBtnStyle, color: "var(--v4-danger)" }}>
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* 편집 모달 */}
      {editTarget && (
        <EditModal
          value={editTarget}
          onChange={setEditTarget}
          onSave={handleSave}
          onCancel={() => setEditTarget(null)}
          saving={saving}
          existingComplexes={list.map((l) => l.complex_name)}
        />
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <ConfirmDialog
          title="단지 프로필 삭제"
          message={`[${deleteTarget.complex_name}] 단지의 ${myBankName} 프로필을 삭제합니다. 입주민 앱에선 글로벌 프로필이 표시됩니다.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ===== 편집 모달 =====
function EditModal({
  value, onChange, onSave, onCancel, saving, existingComplexes,
}: {
  value: ComplexBankProfile;
  onChange: (v: ComplexBankProfile) => void;
  onSave: (v: ComplexBankProfile) => void;
  onCancel: () => void;
  saving: boolean;
  existingComplexes: string[];
}) {
  const set = (k: keyof ComplexBankProfile) => (e: any) =>
    onChange({ ...value, [k]: e.target?.value ?? e });

  // 신규 등록 시: 이미 등록된 단지 제외한 단지명 옵션
  const complexOptions = useMemo(() => {
    if (value.id) return [value.complex_name]; // 수정 시엔 잠금
    return DEFAULT_COMPLEXES.filter((c) => !existingComplexes.includes(c));
  }, [value.id, value.complex_name, existingComplexes]);

  return (
    <div role="dialog" aria-modal="true" style={modalOverlayStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={modalBoxStyle}>
        <div style={modalHeaderStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
            {value.id ? "단지별 프로필 수정" : "새 단지 추가"}
          </h3>
          <button onClick={onCancel} style={iconBtnStyle}>×</button>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="단지명 *">
            {value.id ? (
              <input value={value.complex_name} disabled style={inputStyleDisabled} />
            ) : complexOptions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--v4-danger)", margin: 0 }}>
                추가 가능한 단지가 없습니다 (모두 등록 완료).
              </p>
            ) : (
              <select value={value.complex_name} onChange={set("complex_name")} style={inputStyle}>
                <option value="">— 단지 선택 —</option>
                {complexOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </Field>

          <Field label="지점명 (예: 부전동지점)">
            <input value={value.branch_name ?? ""} onChange={set("branch_name")} placeholder="잠실지점, 부전동지점 등" style={inputStyle} />
          </Field>

          <Field label="인사말">
            <textarea rows={3} value={value.greeting ?? ""} onChange={set("greeting")}
              placeholder="예: 신한은행 잠실지점 입주잔금 전담입니다. 친절하고 신속한 상담 약속드립니다."
              style={textareaStyle} />
          </Field>

          <Field label="취급 상품">
            <textarea rows={5} value={value.products ?? ""} onChange={set("products")}
              placeholder="▣ 정부 정책대출
  · 디딤돌대출 (신혼·다자녀)
  · 보금자리론
  · 신생아 특례 디딤돌대출

▣ 자체 상품
  · 잔금대출 (고정/변동)
  · 신혼부부 우대"
              style={textareaStyle} />
          </Field>

          <Two>
            <Field label="영업시간">
              <input value={value.business_hours ?? ""} onChange={set("business_hours")} placeholder="평일 09:00~18:00" style={inputStyle} />
            </Field>
            <Field label="연락처">
              <input value={value.contact_phone ?? ""} onChange={set("contact_phone")} placeholder="02-1588-9999" style={inputStyle} />
            </Field>
          </Two>

          <Field label="이메일 (선택)">
            <input value={value.contact_email ?? ""} onChange={set("contact_email")} placeholder="loan@example.com" style={inputStyle} />
          </Field>

          <Field label="공지 (선택)">
            <textarea rows={2} value={value.notice ?? ""} onChange={set("notice")}
              placeholder="예: 5/1~5/5 연휴 기간 상담 일시 중단" style={textareaStyle} />
          </Field>

          <div style={{ borderTop: "1px solid var(--v4-border-tertiary)", paddingTop: 12 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!value.is_closed}
                onChange={(e) => onChange({ ...value, is_closed: e.target.checked })}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {value.is_closed ? "🔴 이 단지에서 모집 마감" : "🟢 이 단지에서 모집 중"}
              </span>
            </label>
            {value.is_closed && (
              <input value={value.closing_message ?? ""} onChange={set("closing_message")}
                placeholder="예: 이 단지 차수 마감 — 다음 차수 안내 예정"
                style={{ ...inputStyle, marginTop: 8 }} />
            )}
          </div>

          {value.id && value.updated_by && (
            <p style={{ fontSize: 11, color: "var(--v4-text-tertiary)", margin: 0 }}>
              마지막 수정: {value.updated_by} · {value.updated_at?.slice(0, 16).replace("T", " ")}
            </p>
          )}
        </div>

        <div style={modalFooterStyle}>
          <button onClick={onCancel} style={secondaryBtnStyle}>취소</button>
          <button onClick={() => onSave(value)} disabled={saving || !value.complex_name?.trim()} style={primaryBtnStyle}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }:
  { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="dialog" aria-modal="true" style={modalOverlayStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...modalBoxStyle, maxWidth: 420 }}>
        <div style={{ padding: "16px 18px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{title}</h3>
          <p style={{ fontSize: 12, color: "var(--v4-text-secondary)", margin: 0, lineHeight: 1.6 }}>{message}</p>
        </div>
        <div style={modalFooterStyle}>
          <button onClick={onCancel} style={secondaryBtnStyle}>취소</button>
          <button onClick={onConfirm} style={{ ...primaryBtnStyle, background: "var(--v4-danger)" }}>삭제</button>
        </div>
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

// === styles ===
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "var(--v4-bg-secondary)" };
const headerStyle: React.CSSProperties = { height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid var(--v4-border-tertiary)", background: "var(--v4-bg-primary)", position: "sticky", top: 0, zIndex: 20 };
const backBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--v4-text-secondary)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: "var(--v4-radius-md)", fontFamily: "inherit" };
const primaryBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", fontSize: 12.5, fontWeight: 600, color: "#fff", background: "var(--v4-info)", border: "none", borderRadius: "var(--v4-radius-md)", cursor: "pointer", fontFamily: "inherit" };
const secondaryBtnStyle: React.CSSProperties = { padding: "7px 14px", fontSize: 12, fontWeight: 500, color: "var(--v4-text-secondary)", background: "var(--v4-bg-primary)", border: "1px solid var(--v4-border-tertiary)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" };
const ghostBtnStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11.5, color: "var(--v4-text-secondary)", background: "transparent", border: "1px solid var(--v4-border-tertiary)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit" };
const iconBtnStyle: React.CSSProperties = { width: 28, height: 28, fontSize: 18, color: "var(--v4-text-secondary)", background: "transparent", border: "1px solid var(--v4-border-tertiary)", borderRadius: 6, cursor: "pointer" };
const cardStyle: React.CSSProperties = { background: "var(--v4-bg-primary)", border: "1px solid var(--v4-border-tertiary)", borderRadius: 8, padding: "12px 14px" };
const closedBadgeStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9.5, fontWeight: 600, color: "var(--v4-danger)", background: "#FEE2E2", border: "1px solid #FCA5A5", padding: "1px 5px", borderRadius: 999 };
const emptyBoxStyle: React.CSSProperties = { padding: "32px 20px", textAlign: "center", background: "var(--v4-bg-primary)", border: "1px dashed var(--v4-border-secondary)", borderRadius: 8 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", color: "var(--v4-text-primary)", background: "var(--v4-bg-primary)", border: "1px solid var(--v4-border-secondary)", borderRadius: 6, boxSizing: "border-box" };
const inputStyleDisabled: React.CSSProperties = { ...inputStyle, background: "var(--v4-bg-tertiary)", color: "var(--v4-text-tertiary)", cursor: "not-allowed" };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", minHeight: 60, lineHeight: 1.5, fontFamily: "inherit" };
const modalOverlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBoxStyle: React.CSSProperties = { width: "min(560px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "var(--v4-bg-primary)", borderRadius: "var(--v4-radius-lg)", border: "1px solid var(--v4-border-secondary)", boxShadow: "0 24px 48px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--v4-border-tertiary)" };
const modalFooterStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--v4-border-tertiary)", background: "var(--v4-bg-secondary)" };
