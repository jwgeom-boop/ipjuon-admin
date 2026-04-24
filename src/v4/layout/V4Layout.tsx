import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CommandPalette } from "../palette/CommandPalette";
import { useAuth } from "@/contexts/AuthContext";
import { parseBankLoginId } from "../auth/role";

export function V4Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { isAuthenticated, loginId, role, bankRole, mustChangePassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (role !== "bank") {
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [isAuthenticated, role, navigate]);

  // 최초 로그인 비번 변경 강제: /v4/change-password 외 접근 차단
  useEffect(() => {
    if (!isAuthenticated || role !== "bank") return;
    if (!mustChangePassword) return;
    if (location.pathname !== "/v4/change-password") {
      navigate("/v4/change-password", { replace: true });
    }
  }, [isAuthenticated, role, mustChangePassword, location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated || role !== "bank") return;
    if (mustChangePassword) return; // 비번 변경 페이지에서는 라우팅 가드 우회
    // bankRole 우선 (백엔드 분리됨), 없으면 loginId 파싱 폴백 (legacy)
    const effectiveRole: "manager" | "consultant" | null =
      bankRole === "bank_manager" ? "manager"
      : bankRole === "bank_consultant" ? "consultant"
      : (parseBankLoginId(loginId)?.role ?? null);
    if (!effectiveRole) return;
    const onTeam = location.pathname.startsWith("/v4/team");
    const onWizard = location.pathname.startsWith("/v4/wizard");
    if (onWizard) return;
    // 팀장이 /v4?assignee=... 로 특정 팀원의 큐를 들여다볼 때는 허용
    const managerDrillingIntoConsultant =
      effectiveRole === "manager" &&
      location.pathname === "/v4" &&
      new URLSearchParams(location.search).has("assignee");
    if (effectiveRole === "manager" && !onTeam && !managerDrillingIntoConsultant) {
      navigate("/v4/team", { replace: true });
    } else if (effectiveRole === "consultant" && onTeam) {
      navigate("/v4", { replace: true });
    }
  }, [isAuthenticated, loginId, role, bankRole, mustChangePassword, location.pathname, location.search, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!isAuthenticated || role !== "bank") return null;

  return (
    <>
      <Outlet />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
