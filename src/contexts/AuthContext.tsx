import { createContext, useContext, useState, ReactNode } from "react";

const API_BASE_URL = 'https://banking-coroner-grader.ngrok-free.dev/api';
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
  bankName: string | null;
  login: (id: string, password: string) => Promise<{ success: boolean; role?: string; bank_name?: string }>;
  logout: () => void;
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
  const [bankName, setBankName] = useState<string | null>(
    () => sessionStorage.getItem("bank_name")
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
        sessionStorage.setItem("admin_auth", "true");
        sessionStorage.setItem("admin_role", data.role);
        if (data.bank_name) {
          setBankName(data.bank_name);
          sessionStorage.setItem("bank_name", data.bank_name);
        }
        return { success: true, role: data.role, bank_name: data.bank_name };
      }
    } catch { /* ignore */ }
    return { success: false };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setRole(null);
    setBankName(null);
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_role");
    sessionStorage.removeItem("bank_name");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, bankName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
