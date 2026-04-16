import { createContext, useContext, useState, ReactNode } from "react";

const API_BASE_URL = 'https://banking-coroner-grader.ngrok-free.dev/api';
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
  login: (id: string, password: string) => Promise<{ success: boolean; role?: string }>;
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
        return { success: true, role: data.role };
      }
    } catch { /* ignore */ }
    return { success: false };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setRole(null);
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_role");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
