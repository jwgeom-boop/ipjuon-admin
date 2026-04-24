import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Kbd } from "../components/Kbd";
import { StageStrip, Stage } from "./StageStrip";

export function WizardShell({
  customerLabel,
  dDay,
  stages,
  current,
  onJump,
  footer,
  children,
}: {
  customerLabel: string;
  dDay?: string;
  stages?: Stage[];
  current?: number;
  onJump?: (i: number) => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="v4-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--v4-bg-primary)" }}>
      {/* Top bar */}
      <header
        style={{
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
        }}
      >
        <Link
          to="/v4"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "var(--v4-text-secondary)",
            textDecoration: "none",
            padding: "4px 10px",
            borderRadius: "var(--v4-radius-md)",
          }}
        >
          <ArrowLeft size={13} strokeWidth={1.8} />
          오늘의 리스트
          <Kbd>ESC</Kbd>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
          <span style={{ color: "var(--v4-text-primary)", fontWeight: 500 }}>{customerLabel}</span>
          {dDay ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--v4-danger)",
                background: "var(--v4-bg-danger)",
                padding: "2px 8px",
                borderRadius: "var(--v4-radius-sm)",
                fontWeight: 500,
              }}
            >
              {dDay}
            </span>
          ) : null}
        </div>
      </header>

      {/* Stage strip */}
      {stages && typeof current === "number" ? (
        <StageStrip stages={stages} current={current} onJump={onJump} />
      ) : null}

      {/* Body */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        <div
          style={{
            maxWidth: 720,
            width: "100%",
            margin: "0 auto",
            padding: "40px 40px 120px",
          }}
        >
          {children}
        </div>
      </main>

      {/* Action bar */}
      {footer ? (
        <footer
          style={{
            height: 56,
            borderTop: "1px solid var(--v4-border-tertiary)",
            background: "var(--v4-bg-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }}
        >
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
