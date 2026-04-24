import type { TaskItem } from "../home/TaskRow";
import type { UrgencyLevel } from "@/lib/urgency";

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  critical: "#dc2626",
  urgent: "#dc2626",
  warning: "#d97706",
  normal: "#2563eb",
};

const URGENCY_DDAY: Record<UrgencyLevel, string> = {
  critical: "#991b1b",
  urgent: "#991b1b",
  warning: "#92400e",
  normal: "#4a4a4a",
};

function splitAddress(label?: string) {
  if (!label) return { dongHo: "", complex: "" };
  const parts = label.split(/\s*·\s*/);
  return { dongHo: parts[0]?.trim() ?? "", complex: parts[1]?.trim() ?? "" };
}

const ACTION_HIGHLIGHT = [
  "필요자금",
  "정산",
  "실행",
  "자서",
  "연락",
  "발송",
  "확인",
  "심사",
  "납부",
  "접수",
  "취합",
  "안내",
  "예정",
  "확정",
  "대기",
];

function renderAction(text: string) {
  const pattern = new RegExp(`(${ACTION_HIGHLIGHT.join("|")})`, "g");
  const parts = text.split(pattern);
  return parts.map((p, i) =>
    ACTION_HIGHLIGHT.includes(p) ? (
      <b key={i} style={{ fontWeight: 500, color: "var(--v4-text-primary)" }}>
        {p}
      </b>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function InboxRow({
  task,
  selected,
  done,
  onClick,
}: {
  task: TaskItem;
  selected?: boolean;
  done?: boolean;
  onClick?: () => void;
}) {
  const dotColor = done ? "#cbcac5" : URGENCY_DOT[task.urgency];
  const ddayColor = done ? "#cbcac5" : URGENCY_DDAY[task.urgency];
  const { dongHo, complex } = splitAddress(task.addressLabel);
  // 오늘 안 처리하면 펑크 — critical + 입금대기 콤보는 좌측 바·뱃지로 강조 (선택 시에도 유지)
  const isAlert = !done && task.urgency === "critical" && task.fundsStatus === "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className="v4-inbox-row"
      data-selected={selected ? "true" : undefined}
      data-done={done ? "true" : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "10px minmax(0, 1fr) auto",
        columnGap: 12,
        alignItems: "start",
        width: "100%",
        padding: "14px 18px",
        border: "none",
        borderBottom: "1px solid var(--v4-border-light)",
        borderLeft: isAlert ? "4px solid #dc2626" : "3px solid transparent",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        position: "relative",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dotColor,
          marginTop: 6,
        }}
      />

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: done ? "var(--v4-text-tertiary)" : "var(--v4-text-primary)",
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {task.customerName}
          </span>
          <span
            className="v4-tabular"
            style={{
              fontSize: 11.5,
              color: "var(--v4-text-tertiary)",
              fontWeight: 400,
              whiteSpace: "nowrap",
            }}
          >
            {dongHo}
          </span>
          {complex ? (
            <span
              style={{
                fontSize: 11.5,
                color: "var(--v4-text-tertiary)",
                fontWeight: 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              · {complex}
            </span>
          ) : null}
          {isAlert ? (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#fff",
                background: "#dc2626",
                padding: "1px 6px",
                borderRadius: "var(--v4-radius-sm)",
                whiteSpace: "nowrap",
                marginLeft: 4,
                letterSpacing: "0.2px",
              }}
            >
              미입금
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: done ? "var(--v4-text-tertiary)" : "var(--v4-text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {renderAction(task.nextAction)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          paddingTop: 2,
          minWidth: 60,
        }}
      >
        {task.time ? (
          <span
            className="v4-tabular"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: ddayColor,
              whiteSpace: "nowrap",
            }}
          >
            {task.time}
          </span>
        ) : null}
        {task.assignee ? (
          <span
            style={{
              fontSize: 11,
              color: "var(--v4-text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            {task.assignee}
          </span>
        ) : null}
      </div>

      <style>{`
        .v4-inbox-row:hover { background: var(--v4-bg-secondary); }
        .v4-inbox-row[data-selected="true"] {
          background: var(--v4-bg-info);
          border-left-color: var(--v4-info);
        }
        .v4-inbox-row[data-done="true"] {
          opacity: 0.55;
        }
      `}</style>
    </button>
  );
}
