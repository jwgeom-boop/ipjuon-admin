import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="v4-root" style={{ minHeight: "100vh", background: "var(--v4-bg-primary)" }}>
      <main style={{ minHeight: "100vh" }}>{children}</main>
    </div>
  );
}
