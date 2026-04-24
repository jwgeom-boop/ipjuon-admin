import type { UrgencyLevel } from "@/lib/urgency";

const COLORS: Record<UrgencyLevel, string> = {
  critical: "#dc2626",
  urgent: "#d97706",
  warning: "#2563eb",
  normal: "#c9c9c6",
};

export function UrgencyMark({ level }: { level: UrgencyLevel }) {
  const color = COLORS[level] ?? COLORS.normal;
  const isCritical = level === "critical";
  const isSolid = level === "critical" || level === "urgent";

  return (
    <span
      aria-hidden
      className={isCritical ? "v4-mark-critical" : undefined}
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: isSolid ? color : "transparent",
        border: isSolid ? `1px solid ${color}` : `1.5px solid ${color}`,
      }}
    />
  );
}
