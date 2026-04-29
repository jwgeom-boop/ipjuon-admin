import { Phone, MessageSquare } from "lucide-react";
import { MouseEvent } from "react";
import type { UrgencyLevel } from "@/lib/urgency";
import type { SectionTone } from "./TaskSection";
import { diffDaysFromToday, formatDday, ddayTone } from "../lib/dday";

export type NoticeStatus = "unsent" | "sent" | "confirmed";
export type FundsStatus = "pending" | "received" | "settled";

export interface DocItem {
  label: string;
  received?: boolean;
}

export interface Checkpoint {
  label: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  urgency: UrgencyLevel;
  customerName: string;
  addressLabel: string;
  nextAction: string;
  tag?: string;
  time?: string;
  phone?: string;
  assignee?: string;

  // signing detail
  signingSlot?: string;
  signingPlace?: string;
  signingDateLabel?: string;
  signingDate?: string; // ISO YYYY-MM-DD — 자서예약/자서 단계 자동 전환 기준
  loanAmount?: number;
  executionDate?: string;
  repayment?: string;
  borrower?: string;
  phones?: string[];
  note?: string;
  size?: number;
  aptType?: string;          // 평형 코드 (예: "84A", "59B", "74A") — 단지 템플릿 매칭에 사용
  residentNo?: string;
  additionalLoan?: number;
  intermediatePrincipal?: number;
  intermediateInterest?: number;
  shortfallPrincipal?: number;
  shortfallInterest?: number;
  balconyAmount?: number;
  optionAmount?: number;
  surrogateInterest?: number;
  guaranteeFee?: number;
  preMgmtFee?: number;
  mgmtFee?: number;
  movingFee?: number;
  companyFunds?: number;
  stampDutyLoan?: number;
  stampDutyAdditional?: number;
  internalNote?: string;
  intermediateContact?: string;
  moveInDate?: string;
  documents?: DocItem[];
  noticeStatus?: NoticeStatus;
  companion?: string;

  // execution detail
  fundsAmount?: number;
  fundsStatus?: FundsStatus;
  closingDate?: string;
  checkpoints?: Checkpoint[];
  legalAgent?: string;

  // B2C resident actions (알림함 + 진행도)
  bankName?: string;
  residentLastActionAt?: string;       // ISO
  residentLastActionType?: string;     // accept/cancel/signing_select/...
  residentDocChecks?: string;          // 쉼표 구분 doc id
  residentDocChecksAt?: string;
}

const TAG_TONE: Record<string, string> = {
  실행: "v4-tag-success",
  자서: "v4-tag-info",
  자서예약: "v4-tag-info",
  예약: "v4-tag-info",
  심사중: "v4-tag-neutral",
  재연락: "v4-tag-warning",
  지연: "v4-tag-danger",
  신규: "v4-tag-warning",
  미상담: "v4-tag-danger",
  취소요청: "v4-tag-danger",   // 입주민 취소 요청 — 빨간색 강조
  취소: "v4-tag-neutral",
};

const CONTACT_TAGS = new Set(["신규", "미상담", "재연락"]);

const DOT_COLOR: Record<SectionTone, string> = {
  danger: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  success: "#16a34a",
  neutral: "#9a9996",
};

const DDAY_COLOR: Record<SectionTone, string> = {
  danger: "#991b1b",
  warning: "#92400e",
  info: "#1e40af",
  success: "#166534",
  neutral: "#4a4a4a",
};

function splitAddress(label?: string): { dongHo: string; complex: string } {
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

export function TaskRow({
  task,
  onOpen,
  onCall,
  onSms,
  hideComplex,
  tone = "neutral",
}: {
  task: TaskItem;
  onOpen?: (id: string) => void;
  onCall?: (id: string) => void;
  onSms?: (id: string) => void;
  hideComplex?: boolean;
  tone?: SectionTone;
}) {
  const tagClass = task.tag ? TAG_TONE[task.tag] ?? "v4-tag-neutral" : "v4-tag-neutral";
  const showInlineActions = task.tag ? CONTACT_TAGS.has(task.tag) : false;
  const { dongHo, complex } = splitAddress(task.addressLabel);
  const dotColor = DOT_COLOR[tone];
  const ddayColor = DDAY_COLOR[tone];
  const isTimeCritical = tone === "danger" || tone === "warning";

  const handleAction = (e: MouseEvent, fn?: (id: string) => void) => {
    e.stopPropagation();
    fn?.(task.id);
  };

  const gridTemplate = hideComplex
    ? "14px 90px 100px minmax(0, 1fr) 75px 90px 60px"
    : "14px 90px 100px 110px minmax(0, 1fr) 75px 90px 60px";

  return (
    <button
      type="button"
      onClick={() => onOpen?.(task.id)}
      className="v4-task-row"
      style={{
        display: "grid",
        gridTemplateColumns: gridTemplate,
        alignItems: "center",
        columnGap: 12,
        width: "100%",
        height: 48,
        padding: "0 14px",
        border: "none",
        borderBottom: "1px solid var(--v4-border-light)",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      {/* Urgency dot */}
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dotColor,
          display: "inline-block",
        }}
      />

      {/* Name */}
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: "var(--v4-text-primary)",
          letterSpacing: "-0.1px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {task.customerName}
      </span>

      {/* Dong-Ho */}
      <span
        className="v4-tabular"
        style={{
          fontSize: 12,
          color: "var(--v4-text-secondary)",
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {dongHo}
      </span>

      {/* Complex */}
      {!hideComplex ? (
        <span
          style={{
            fontSize: 11.5,
            color: "var(--v4-text-tertiary)",
            fontWeight: 400,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {complex}
        </span>
      ) : null}

      {/* Action sentence */}
      <span
        style={{
          minWidth: 0,
          fontSize: 12.5,
          color: "var(--v4-text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {renderAction(task.nextAction)}
        </span>
        {showInlineActions ? (
          <span
            className="v4-row-actions"
            style={{ display: "inline-flex", gap: 4, opacity: 0, transition: "opacity 140ms", flexShrink: 0 }}
          >
            <button
              type="button"
              className="v4-row-action"
              onClick={(e) => handleAction(e, onCall)}
              title="전화"
            >
              <Phone size={12} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="v4-row-action"
              onClick={(e) => handleAction(e, onSms)}
              title="문자"
            >
              <MessageSquare size={12} strokeWidth={1.8} />
            </button>
          </span>
        ) : null}
      </span>

      {/* Assignee */}
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 400,
          color: "var(--v4-text-tertiary)",
          whiteSpace: "nowrap",
          textAlign: "right",
        }}
      >
        {task.assignee ?? ""}
      </span>

      {/* Tag */}
      <span style={{ display: "inline-flex", justifyContent: "flex-start" }}>
        {task.tag ? <span className={`v4-tag ${tagClass}`}>{task.tag}</span> : null}
      </span>

      {/* Time / D-day */}
      {(() => {
        const diff = diffDaysFromToday(task.executionDate);
        if (diff != null && diff <= 7) {
          const tone = ddayTone(diff);
          return (
            <span
              className="v4-tabular"
              title={task.executionDate}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
                background: tone.bg,
                color: tone.color,
                letterSpacing: 0.3,
                whiteSpace: "nowrap",
                textAlign: "center",
                justifySelf: "end",
              }}
            >
              {formatDday(diff)}
            </span>
          );
        }
        return (
          <span
            className="v4-tabular"
            style={{
              fontSize: 13.5,
              color: isTimeCritical ? ddayColor : "var(--v4-text-tertiary)",
              fontWeight: isTimeCritical ? 500 : 400,
              whiteSpace: "nowrap",
              textAlign: "right",
            }}
          >
            {task.time ?? ""}
          </span>
        );
      })()}

      <style>{`
        .v4-task-row:hover { background: #fafaf9; }
        .v4-task-row:hover .v4-row-actions {
          opacity: 1;
        }
        .v4-row-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border: 1px solid var(--v4-border-primary);
          background: var(--v4-bg-primary);
          border-radius: 4px;
          cursor: pointer;
          color: var(--v4-text-secondary);
          font-family: inherit;
        }
        .v4-row-action:hover {
          background: var(--v4-bg-tertiary);
          color: var(--v4-text-primary);
        }
      `}</style>
    </button>
  );
}
