import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Tone = "info" | "success" | "warning" | "danger" | "neutral";

const TONE_BG: Record<Tone, string> = {
  info: "var(--v4-bg-info)",
  success: "var(--v4-bg-success)",
  warning: "var(--v4-bg-warning)",
  danger: "var(--v4-bg-danger)",
  neutral: "var(--v4-bg-secondary)",
};
const TONE_COLOR: Record<Tone, string> = {
  info: "var(--v4-info)",
  success: "var(--v4-success)",
  warning: "var(--v4-warning)",
  danger: "var(--v4-danger)",
  neutral: "var(--v4-text-secondary)",
};

const TONE_BORDER: Record<Tone, string> = {
  info: "rgba(37, 99, 235, 0.35)",
  success: "rgba(22, 163, 74, 0.35)",
  warning: "rgba(217, 119, 6, 0.35)",
  danger: "rgba(220, 38, 38, 0.35)",
  neutral: "var(--v4-border-tertiary)",
};

export function SidePanel({
  title,
  icon,
  tone = "neutral",
  meta,
  children,
  collapsible,
  defaultCollapsed,
  tinted,
  onIconClick,
}: {
  title: string;
  icon?: ReactNode;
  tone?: Tone;
  meta?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  tinted?: boolean;
  onIconClick?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const isCollapsible = collapsible ?? defaultCollapsed !== undefined;

  const headerBg = tinted ? TONE_BG[tone] : "var(--v4-bg-primary)";
  const borderColor = tinted ? TONE_BORDER[tone] : "var(--v4-border-tertiary)";
  const titleColor = tinted ? TONE_COLOR[tone] : "var(--v4-text-primary)";

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--v4-radius-md)",
        background: "var(--v4-bg-primary)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 14px",
          borderBottom: collapsed ? "none" : `1px solid ${borderColor}`,
          background: headerBg,
          cursor: isCollapsible ? "pointer" : "default",
        }}
        onClick={isCollapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {isCollapsible ? (
            <span style={{ display: "inline-flex", color: TONE_COLOR[tone] }}>
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </span>
          ) : null}
          {icon ? (
            onIconClick ? (
              <button
                type="button"
                className="v4-panel-icon v4-panel-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onIconClick();
                }}
                title="달력 열기"
                style={{
                  background: tinted ? "var(--v4-bg-primary)" : TONE_BG[tone],
                  color: TONE_COLOR[tone],
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                {icon}
              </button>
            ) : (
              <span
                className="v4-panel-icon"
                style={{
                  background: tinted ? "var(--v4-bg-primary)" : TONE_BG[tone],
                  color: TONE_COLOR[tone],
                }}
              >
                {icon}
              </span>
            )
          ) : null}
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: titleColor,
              letterSpacing: "-0.1px",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </h3>
        </div>
        {meta ? (
          <span
            className="v4-tabular"
            style={{
              fontSize: 11,
              color: tinted ? TONE_COLOR[tone] : "var(--v4-text-tertiary)",
              fontWeight: tinted ? 600 : 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {meta}
          </span>
        ) : null}
      </header>
      {!collapsed ? <div style={{ padding: 14 }}>{children}</div> : null}
    </div>
  );
}
