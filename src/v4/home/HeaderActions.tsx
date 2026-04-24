import { UserPlus, List, Calendar, FileText, BarChart3, Layers } from "lucide-react";

export type HeaderActionKey = "new" | "list" | "signing" | "print" | "pipeline" | "monthly";

const SECONDARY_ITEMS: { key: HeaderActionKey; label: string; icon: typeof FileText }[] = [
  { key: "list",     label: "상담 리스트",   icon: List },
  { key: "signing",  label: "자서 예약",     icon: Calendar },
  { key: "print",    label: "상환조회",      icon: FileText },
  { key: "pipeline", label: "전체 진행현황", icon: Layers },
  { key: "monthly",  label: "월별 실적",     icon: BarChart3 },
];

export function HeaderActions({
  onAction,
}: {
  onAction: (key: HeaderActionKey) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => onAction("new")}
        className="v4-hdr-primary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          fontSize: 12,
          fontWeight: 500,
          color: "#fff",
          background: "var(--v4-info)",
          border: "1px solid transparent",
          borderRadius: 6,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <UserPlus size={13} strokeWidth={2.2} />
        신규 고객
      </button>

      {SECONDARY_ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onAction(it.key)}
          className="v4-hdr-secondary"
          style={hdrSecondaryStyle}
        >
          <it.icon size={13} strokeWidth={1.8} />
          {it.label}
        </button>
      ))}

      <style>{`
        .v4-hdr-primary:hover { background: #1d4ed8; }
        .v4-hdr-secondary:hover { background: var(--v4-bg-tertiary); color: var(--v4-text-primary); }
      `}</style>
    </div>
  );
}

const hdrSecondaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 400,
  color: "var(--v4-text-secondary)",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "inherit",
};
