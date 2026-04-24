import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ChangePassword() {
  const { loginId, bankRole, mustChangePassword, clearMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isManager = bankRole === "bank_manager";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginId) return setError("로그인 정보가 없습니다");
    if (newPw.length < 6) return setError("새 비밀번호는 6자 이상이어야 합니다");
    if (newPw !== confirmPw) return setError("새 비밀번호와 확인이 일치하지 않습니다");
    if (newPw === currentPw) return setError("현재 비밀번호와 다른 값을 입력해주세요");

    setSubmitting(true);
    try {
      const res = await api.changePassword(loginId, currentPw, newPw);
      if (res.success) {
        clearMustChangePassword();
        toast.success("비밀번호가 변경되었습니다");
        navigate(isManager ? "/v4/team" : "/v4", { replace: true });
      } else {
        setError(res.message || "변경 실패");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--v4-bg-secondary)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--v4-bg-primary)",
          border: "1px solid var(--v4-border-secondary)",
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--v4-text-primary)", marginBottom: 6 }}>
          비밀번호 변경
        </h1>
        <p style={{ fontSize: 12.5, color: "var(--v4-text-secondary)", marginBottom: 20 }}>
          {mustChangePassword
            ? "최초 로그인입니다. 안전한 비밀번호로 변경해주세요."
            : "비밀번호를 변경합니다."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--v4-bg-danger)",
                color: "var(--v4-text-danger)",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--v4-border-danger)",
              }}
            >
              {error}
            </div>
          )}

          <Field label="현재 비밀번호" value={currentPw} onChange={setCurrentPw} type="password" autoFocus />
          <Field label="새 비밀번호 (6자 이상)" value={newPw} onChange={setNewPw} type="password" />
          <Field label="새 비밀번호 확인" value={confirmPw} onChange={setConfirmPw} type="password" />

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 8,
              padding: "10px 14px",
              background: submitting ? "var(--v4-bg-tertiary)" : "var(--v4-text-primary)",
              color: "var(--v4-bg-primary)",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {submitting ? "변경 중..." : "비밀번호 변경"}
          </button>

          {!mustChangePassword && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: "8px 14px",
                background: "transparent",
                color: "var(--v4-text-secondary)",
                fontSize: 12,
                border: "1px solid var(--v4-border-secondary)",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              취소
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--v4-text-secondary)" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        style={{
          padding: "8px 10px",
          fontSize: 13,
          border: "1px solid var(--v4-border-secondary)",
          borderRadius: 6,
          background: "var(--v4-bg-primary)",
          color: "var(--v4-text-primary)",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}
