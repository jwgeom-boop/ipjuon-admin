import { Link } from "react-router-dom";

export function TopNav() {
  return (
    <header
      className="v4-root"
      style={{
        height: 42,
        borderBottom: "1px solid var(--v4-border-tertiary)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        background: "var(--v4-bg-primary)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Link
        to="/v4"
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.2px",
          color: "var(--v4-text-primary)",
          textDecoration: "none",
        }}
      >
        입주ON
      </Link>
    </header>
  );
}
