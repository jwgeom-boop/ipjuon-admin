import { Plus, Calendar, FileText, Send, List, BarChart3 } from "lucide-react";
import { Kbd } from "../components/Kbd";

export type QuickActionKey = "list" | "signing" | "print" | "sms" | "monthly";

const ACTIONS: { icon: typeof Plus; label: string; key: string; action: QuickActionKey }[] = [
  { icon: List, label: "상담 리스트", key: "C", action: "list" },
  { icon: Calendar, label: "자서 예약", key: "S", action: "signing" },
  { icon: FileText, label: "상환조회", key: "P", action: "print" },
  { icon: Send, label: "SMS 발송", key: "M", action: "sms" },
  { icon: BarChart3, label: "월별 실적", key: "R", action: "monthly" },
];

export function QuickActions({ onAction }: { onAction?: (key: QuickActionKey) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onAction?.(a.action)}
          className="v4-quick"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 30,
            padding: "0 12px",
            fontSize: 12,
            color: "var(--v4-text-secondary)",
            background: "var(--v4-bg-primary)",
            border: "1px solid var(--v4-border-tertiary)",
            borderRadius: "var(--v4-radius-md)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <a.icon size={13} strokeWidth={1.8} />
          <span>{a.label}</span>
          <Kbd>{a.key}</Kbd>
        </button>
      ))}
      <style>{`
        .v4-quick:hover {
          background: var(--v4-bg-secondary);
          color: var(--v4-text-primary);
        }
      `}</style>
    </div>
  );
}
