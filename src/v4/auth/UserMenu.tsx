import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Home, LogOut, UserCircle2, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseBankLoginId } from "./role";

type Props = {
  impersonatingAs?: string | null;
};

export function UserMenu({ impersonatingAs }: Props = {}) {
  const { bankName, loginId, bankRole, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const impersonating = !!impersonatingAs;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // bankRole 우선 (백엔드 신규), 없으면 loginId 파싱 폴백
  const effectiveRole: "manager" | "consultant" | null =
    bankRole === "bank_manager" ? "manager"
    : bankRole === "bank_consultant" ? "consultant"
    : (parseBankLoginId(loginId)?.role ?? null);
  const roleLabel =
    effectiveRole === "manager" ? "팀장" : effectiveRole === "consultant" ? "상담사" : "-";
  const roleTone = effectiveRole === "manager" ? "warning" : "info";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={impersonating ? `${impersonatingAs} 계정으로 대리 접속 중` : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 500,
          color: impersonating ? "var(--v4-text-warning)" : "var(--v4-text-secondary)",
          background: impersonating
            ? "var(--v4-bg-warning)"
            : open
              ? "var(--v4-bg-tertiary)"
              : "transparent",
          border: `1px solid ${impersonating ? "var(--v4-border-warning)" : "var(--v4-border-light)"}`,
          borderRadius: 6,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {impersonating ? (
          <UserCog size={14} strokeWidth={1.8} />
        ) : (
          <UserCircle2 size={14} strokeWidth={1.8} />
        )}
        <span>{impersonating ? impersonatingAs : loginId || "—"}</span>
        {impersonating ? (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: 3,
              background: "var(--v4-text-warning)",
              color: "#fff",
              letterSpacing: 0.3,
            }}
          >
            대리
          </span>
        ) : null}
        <ChevronDown size={11} strokeWidth={2} />
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            background: "var(--v4-bg-primary)",
            border: "1px solid var(--v4-border-secondary)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {impersonating ? (
            <>
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--v4-bg-warning)",
                  borderBottom: "1px solid var(--v4-border-warning)",
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: "var(--v4-text-warning)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  대리 접속 중
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--v4-text-warning)",
                    marginTop: 2,
                  }}
                >
                  {impersonatingAs}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    navigate("/v4/team");
                  }}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--v4-text-warning)",
                    background: "var(--v4-bg-primary)",
                    border: "1px solid var(--v4-border-warning)",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  팀 현황으로 복귀
                </button>
              </div>
            </>
          ) : null}
          <div style={{ padding: "10px 12px" }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--v4-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {impersonating ? `${bankName || "—"} · 팀장 계정` : bankName || "—"}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--v4-text-primary)",
                marginTop: 2,
              }}
            >
              {loginId}
            </div>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                fontSize: 10.5,
                fontWeight: 500,
                padding: "2px 7px",
                borderRadius: 3,
                background:
                  roleTone === "warning" ? "var(--v4-bg-warning)" : "var(--v4-bg-info)",
                color:
                  roleTone === "warning" ? "var(--v4-text-warning)" : "var(--v4-text-info)",
              }}
            >
              {roleLabel}
            </span>
          </div>
          <div style={{ borderTop: "1px solid var(--v4-border-light)" }} />

          {/* 입주민 앱 노출 콘텐츠 관리 — 어느 v4 화면에서든 접근 */}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); navigate("/v4/bank-profile"); }}
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v4-bg-tertiary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Building2 size={13} strokeWidth={1.8} />
            은행 프로필 (글로벌)
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); navigate("/v4/bank-profile/complex"); }}
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--v4-bg-tertiary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Home size={13} strokeWidth={1.8} />
            단지별 프로필 관리
          </button>

          <div style={{ borderTop: "1px solid var(--v4-border-light)" }} />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            style={menuItemStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--v4-bg-tertiary)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={13} strokeWidth={1.8} />
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  fontSize: 12,
  color: "var(--v4-text-secondary)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
};
