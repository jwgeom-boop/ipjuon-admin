import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import { api } from "@/lib/api";

interface BankProfile {
  id?: string;
  bank_name: string;
  greeting?: string;
  products?: string;
  business_hours?: string;
  notice?: string;
  is_closed: boolean;
  closing_message?: string;
  contact_phone?: string;
  contact_email?: string;
  updated_by?: string;
  updated_by_role?: string;
  updated_at?: string;
}

const EMPTY: BankProfile = {
  bank_name: "",
  is_closed: false,
};

export default function BankProfileEdit() {
  const navigate = useNavigate();
  const [data, setData] = useState<BankProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMyBankProfile();
        setData(res ?? EMPTY);
      } catch (e: any) {
        toast.error(e?.message ?? "프로필 조회 실패");
      }
      setLoading(false);
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/v4");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const set = <K extends keyof BankProfile>(k: K) => (e: any) =>
    setData((d) => ({ ...d, [k]: e.target?.value ?? e }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.updateMyBankProfile(data);
      setData(saved);
      toast.success("저장되었습니다", { description: "입주민 앱에 즉시 반영됩니다" });
    } catch (e: any) {
      toast.error(e?.message ?? "저장 실패");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="v4-root" style={pageStyle}>
        <div style={{ padding: 40, color: "var(--v4-text-tertiary)" }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="v4-root" style={pageStyle}>
      {/* 헤더 */}
      <header style={headerStyle}>
        <button onClick={() => navigate("/v4")} style={backBtnStyle}>
          <ArrowLeft size={13} strokeWidth={1.8} />
          오늘의 리스트
          <Kbd>ESC</Kbd>
        </button>
        <button onClick={handleSave} disabled={saving} style={saveBtnStyle(saving)}>
          <Save size={13} strokeWidth={1.8} />
          {saving ? "저장 중..." : "저장"}
        </button>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Building2 size={22} strokeWidth={1.6} style={{ color: "var(--v4-info)" }} />
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--v4-text-primary)", margin: 0 }}>
            {data.bank_name || "은행"} 프로필 (글로벌)
          </h1>
        </div>
        <p style={{ fontSize: 12, color: "var(--v4-text-tertiary)", marginBottom: 16 }}>
          입주민 앱(ipjuon-app)에서 보이는 은행 카드/상세 페이지에 노출되는 <strong>글로벌</strong> 내용입니다.
          단지별 데이터가 없을 때 fallback 으로 사용됩니다. 마감 토글 시 신규 동의서 분배에서 제외됩니다.
        </p>
        <button
          type="button"
          onClick={() => navigate("/v4/bank-profile/complex")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--v4-info)",
            background: "var(--v4-bg-info)",
            border: "1px solid #B5CFEB",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 24,
          }}
        >
          🏠 단지별 프로필 관리 →
        </button>

        {/* 마감 여부 */}
        <Section title="모집 상태">
          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={!!data.is_closed}
              onChange={(e) => setData((d) => ({ ...d, is_closed: e.target.checked }))}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {data.is_closed ? "🔴 모집 마감 (신규 분배 제외)" : "🟢 모집 중"}
            </span>
          </label>
          {data.is_closed && (
            <Field label="마감 메시지 (입주민에게 표시)">
              <input
                type="text"
                value={data.closing_message ?? ""}
                onChange={set("closing_message")}
                placeholder="예: 이번 차수 모집 마감 — 다음 차수 안내 예정"
                style={inputStyle}
              />
            </Field>
          )}
        </Section>

        <Section title="인사글">
          <Field label="입주민에게 보이는 첫 문장">
            <textarea
              rows={3}
              value={data.greeting ?? ""}
              onChange={set("greeting")}
              placeholder="예: 안녕하세요, ㅇㅇ은행 입주ON 전담팀입니다. 빠르고 정확한 잔금대출 상담을 약속드립니다."
              style={textareaStyle}
            />
          </Field>
        </Section>

        <Section title="취급 상품">
          <Field label="제공 상품 안내 (자유 형식)">
            <textarea
              rows={4}
              value={data.products ?? ""}
              onChange={set("products")}
              placeholder="예: 잔금대출 (고정/변동), 추가대출, 보증보험 (HUG/HF), 신혼부부 우대 상품"
              style={textareaStyle}
            />
          </Field>
        </Section>

        <Section title="영업시간">
          <Field label="영업 가능 시간">
            <input
              type="text"
              value={data.business_hours ?? ""}
              onChange={set("business_hours")}
              placeholder="예: 평일 09:00~18:00 (점심 12:00~13:00 제외)"
              style={inputStyle}
            />
          </Field>
        </Section>

        <Section title="공지사항">
          <Field label="단기 안내 (선택)">
            <textarea
              rows={2}
              value={data.notice ?? ""}
              onChange={set("notice")}
              placeholder="예: 5/1 ~ 5/5 연휴 기간 상담 일시 중단"
              style={textareaStyle}
            />
          </Field>
        </Section>

        <Section title="대표 연락처">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="대표 전화">
              <input
                type="text"
                value={data.contact_phone ?? ""}
                onChange={set("contact_phone")}
                placeholder="02-1599-8000"
                style={inputStyle}
              />
            </Field>
            <Field label="대표 이메일">
              <input
                type="text"
                value={data.contact_email ?? ""}
                onChange={set("contact_email")}
                placeholder="loan@example.com"
                style={inputStyle}
              />
            </Field>
          </div>
        </Section>

        {data.updated_by && (
          <p style={{ fontSize: 11, color: "var(--v4-text-tertiary)", borderTop: "1px solid var(--v4-border-tertiary)", paddingTop: 12, marginTop: 24 }}>
            마지막 수정: {data.updated_by} ({data.updated_by_role}) · {data.updated_at?.slice(0, 16).replace("T", " ")}
          </p>
        )}

        <button onClick={handleSave} disabled={saving} style={{ ...saveBtnStyle(saving), marginTop: 20, width: "100%", justifyContent: "center", height: 36 }}>
          <Save size={14} strokeWidth={1.8} />
          {saving ? "저장 중..." : "저장 — 입주민 앱에 즉시 반영"}
        </button>
      </main>
    </div>
  );
}

// === styles ===
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--v4-bg-secondary)",
};

const headerStyle: React.CSSProperties = {
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  borderBottom: "1px solid var(--v4-border-tertiary)",
  background: "var(--v4-bg-primary)",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const backBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  color: "var(--v4-text-secondary)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "4px 10px",
  borderRadius: "var(--v4-radius-md)",
  fontFamily: "inherit",
};

const saveBtnStyle = (saving: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 12px",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#fff",
  background: saving ? "var(--v4-text-tertiary)" : "var(--v4-info)",
  border: "none",
  borderRadius: "var(--v4-radius-md)",
  cursor: saving ? "not-allowed" : "pointer",
  fontFamily: "inherit",
});

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--v4-text-primary)",
  background: "var(--v4-bg-primary)",
  border: "1px solid var(--v4-border-secondary)",
  borderRadius: 6,
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 60,
  lineHeight: 1.5,
};

const toggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  padding: "8px 12px",
  background: "var(--v4-bg-primary)",
  border: "1px solid var(--v4-border-secondary)",
  borderRadius: 6,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 12, fontWeight: 600, color: "var(--v4-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </section>
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
