import { useEffect, useRef, useState } from "react";
import { UserPlus, X, Info } from "lucide-react";
import { api } from "@/lib/api";

export interface NewCustomerData {
  customerName: string;
  phone: string;
  complex: string;
  dong: string;
  ho: string;
  size: string;
  loanAmount: string;
  source: string;
  note: string;
}

const SOURCES = ["직접 방문", "전화 문의", "지인 소개", "타 지점 이관", "기타"] as const;

export function NewCustomerModal({
  complexes,
  defaultComplex,
  onClose,
  onSubmit,
}: {
  complexes: string[];
  defaultComplex?: string;
  onClose: () => void;
  onSubmit: (data: NewCustomerData) => void;
}) {
  const [form, setForm] = useState<NewCustomerData>({
    customerName: "",
    phone: "",
    complex: defaultComplex && complexes.includes(defaultComplex) ? defaultComplex : complexes[0] ?? "",
    dong: "",
    ho: "",
    size: "",
    loanAmount: "",
    source: SOURCES[0],
    note: "",
  });
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // 단지 템플릿 미리보기 — 단지/평형 변경 시 자동 조회 (debounce 350ms)
  const [templatePreview, setTemplatePreview] = useState<any | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  useEffect(() => {
    if (!form.complex) { setTemplatePreview(null); return; }
    setTemplateLoading(true);
    const timer = setTimeout(async () => {
      try {
        const t = await api.resolveComplexTemplate(form.complex, form.size || undefined);
        setTemplatePreview(t);
      } catch {
        setTemplatePreview(null);
      }
      setTemplateLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [form.complex, form.size]);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof NewCustomerData>(k: K, v: NewCustomerData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.customerName.trim().length > 0 && form.phone.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(form);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(520px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "var(--v4-bg-primary)",
          borderRadius: "var(--v4-radius-lg)",
          border: "1px solid var(--v4-border-secondary)",
          boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--v4-border-tertiary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "var(--v4-bg-info)",
                color: "var(--v4-info)",
              }}
            >
              <UserPlus size={15} strokeWidth={2} />
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--v4-text-primary)" }}>
                신규 고객 등록
              </div>
              <div style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                앱 외 유입 고객을 직접 등록합니다
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--v4-border-tertiary)",
              borderRadius: 6,
              background: "var(--v4-bg-primary)",
              cursor: "pointer",
              color: "var(--v4-text-secondary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "16px 18px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <Field label="고객명" required>
            <input
              ref={firstFieldRef}
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              placeholder="홍길동"
              style={inputStyle}
            />
          </Field>
          <Field label="전화번호" required>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
              style={inputStyle}
            />
          </Field>

          <Field label="아파트" span={2}>
            <select
              value={form.complex}
              onChange={(e) => update("complex", e.target.value)}
              style={inputStyle}
            >
              {complexes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="동">
            <input
              value={form.dong}
              onChange={(e) => update("dong", e.target.value)}
              placeholder="101"
              inputMode="numeric"
              style={inputStyle}
            />
          </Field>
          <Field label="호수">
            <input
              value={form.ho}
              onChange={(e) => update("ho", e.target.value)}
              placeholder="1502"
              inputMode="numeric"
              style={inputStyle}
            />
          </Field>

          <Field label="평형 (㎡)">
            <input
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
              placeholder="84"
              inputMode="numeric"
              style={inputStyle}
            />
          </Field>
          <Field label="희망 대출액 (원)">
            <input
              value={form.loanAmount}
              onChange={(e) => update("loanAmount", e.target.value)}
              placeholder="280,000,000"
              inputMode="numeric"
              style={inputStyle}
            />
          </Field>

          {/* 단지 템플릿 미리보기 — 자동 채움 가능 항목 안내 */}
          <div style={{ gridColumn: "1 / -1" }}>
            <ComplexInfoBox loading={templateLoading} preview={templatePreview} aptType={form.size} complex={form.complex} />
          </div>

          <Field label="유입 경로" span={2}>
            <select
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              style={inputStyle}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="메모" span={2}>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="상담 내용, 특이사항 등"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
            />
          </Field>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 18px",
            borderTop: "1px solid var(--v4-border-tertiary)",
            background: "var(--v4-bg-secondary)",
            borderBottomLeftRadius: "var(--v4-radius-lg)",
            borderBottomRightRadius: "var(--v4-radius-lg)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--v4-text-secondary)",
              background: "var(--v4-bg-primary)",
              border: "1px solid var(--v4-border-tertiary)",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!valid}
            style={{
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: valid ? "var(--v4-info)" : "var(--v4-text-tertiary)",
              border: "1px solid transparent",
              borderRadius: 6,
              cursor: valid ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              opacity: valid ? 1 : 0.7,
            }}
          >
            등록
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 12.5,
  fontFamily: "inherit",
  color: "var(--v4-text-primary)",
  background: "var(--v4-bg-primary)",
  border: "1px solid var(--v4-border-secondary)",
  borderRadius: 6,
  boxSizing: "border-box",
};

function ComplexInfoBox({
  loading, preview, aptType, complex,
}: {
  loading: boolean;
  preview: any | null;
  aptType: string;
  complex: string;
}) {
  if (loading) {
    return (
      <div style={infoBoxStyle}>
        <Info size={12} style={{ color: "var(--v4-text-tertiary)" }} />
        <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>단지 정보 조회 중...</span>
      </div>
    );
  }
  if (!preview) {
    if (!complex) return null;
    return (
      <div style={{ ...infoBoxStyle, background: "#FFF8E1", borderColor: "#FCE58F" }}>
        <Info size={12} style={{ color: "#B45309" }} />
        <span style={{ fontSize: 11, color: "#92400E" }}>
          [{complex}] 단지 정보가 등록되어 있지 않습니다. 관리자/팀장 화면 → "아파트 관리"에서 먼저 등록하면 정산 단계에서 자동 채움 가능합니다.
        </span>
      </div>
    );
  }
  const matchedFee = preview.matched_mgmt_fee_amount as number | undefined;
  const matchedType = preview.matched_apt_type as string | undefined;
  return (
    <div style={infoBoxStyle}>
      <Info size={12} style={{ color: "var(--v4-info)", flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 11, color: "var(--v4-text-secondary)", lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600, color: "var(--v4-text-primary)" }}>
          ✓ [{preview.complex_name}] 단지 정보 등록됨
        </div>
        <div style={{ marginTop: 2 }}>
          관리비 예치금: {preview.mgmt_fee_bank ?? ""} {preview.mgmt_fee_account ?? "—"}
          {matchedFee != null && (
            <> · {matchedType}평 {matchedFee.toLocaleString("ko-KR")}원</>
          )}
          {!matchedFee && aptType && (
            <span style={{ color: "#B45309" }}> · {aptType}평 금액 미등록</span>
          )}
        </div>
        {preview.general_option_account && (
          <div>옵션대금: {preview.general_option_bank ?? ""} {preview.general_option_account}</div>
        )}
        <div style={{ marginTop: 3, fontSize: 10, color: "var(--v4-text-tertiary)" }}>
          정산 단계(실행)에서 [단지 정보 자동 채움] 버튼으로 위 정보가 자동 입력됩니다.
        </div>
      </div>
    </div>
  );
}

const infoBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 6,
  background: "var(--v4-bg-info)",
  border: "1px solid #C5DAEF",
};

function Field({
  label,
  required,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span === 2 ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--v4-text-tertiary)" }}>
        {label}
        {required ? <span style={{ color: "var(--v4-danger)", marginLeft: 2 }}>*</span> : null}
      </span>
      {children}
    </label>
  );
}
