import { createContext, useContext, useState, ReactNode } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? 'https://banking-coroner-grader.ngrok-free.dev/api';
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
  bankRole: string | null; // bank_manager / bank_consultant (백엔드 신규)
  bankName: string | null;
  displayName: string | null; // 상담사 표시명 (예: 김주임)
  mustChangePassword: boolean;
  loginId: string | null;
  token: string | null;
  login: (id: string, password: string) => Promise<{ success: boolean; role?: string; bank_name?: string; bank_role?: string; must_change_password?: boolean }>;
  logout: () => void;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("admin_auth") === "true"
  );
  const [role, setRole] = useState<string | null>(
    () => sessionStorage.getItem("admin_role")
  );
  const [bankRole, setBankRole] = useState<string | null>(
    () => sessionStorage.getItem("bank_role")
  );
  const [bankName, setBankName] = useState<string | null>(
    () => sessionStorage.getItem("bank_name")
  );
  const [displayName, setDisplayName] = useState<string | null>(
    () => sessionStorage.getItem("display_name")
  );
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(
    () => sessionStorage.getItem("must_change_password") === "true"
  );
  const [loginId, setLoginId] = useState<string | null>(
    () => sessionStorage.getItem("login_id")
  );
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("auth_token")
  );

  const login = async (id: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ username: id, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setRole(data.role);
        setLoginId(id);
        setToken(data.token);
        sessionStorage.setItem("admin_auth", "true");
        sessionStorage.setItem("admin_role", data.role);
        sessionStorage.setItem("login_id", id);
        sessionStorage.setItem("auth_token", data.token);
        if (data.bank_name) {
          setBankName(data.bank_name);
          sessionStorage.setItem("bank_name", data.bank_name);
        }
        if (data.bank_role) {
          setBankRole(data.bank_role);
          sessionStorage.setItem("bank_role", data.bank_role);
        }
        if (data.display_name) {
          setDisplayName(data.display_name);
          sessionStorage.setItem("display_name", data.display_name);
        }
        const must = Boolean(data.must_change_password);
        setMustChangePassword(must);
        sessionStorage.setItem("must_change_password", must ? "true" : "false");
        return { success: true, role: data.role, bank_name: data.bank_name, bank_role: data.bank_role, must_change_password: must };
      }
    } catch { /* ignore */ }
    return { success: false };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setRole(null);
    setBankRole(null);
    setBankName(null);
    setDisplayName(null);
    setMustChangePassword(false);
    setLoginId(null);
    setToken(null);
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_role");
    sessionStorage.removeItem("bank_role");
    sessionStorage.removeItem("bank_name");
    sessionStorage.removeItem("display_name");
    sessionStorage.removeItem("must_change_password");
    sessionStorage.removeItem("login_id");
    sessionStorage.removeItem("auth_token");
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    sessionStorage.setItem("must_change_password", "false");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, bankRole, bankName, displayName, mustChangePassword, loginId, token, login, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
