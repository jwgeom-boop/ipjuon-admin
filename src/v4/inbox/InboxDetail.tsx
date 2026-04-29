import { ReactNode, useState } from "react";
import { ClipboardList, MessageSquare, Phone, Check, ExternalLink, CalendarClock } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";
import SigningSlotDialog from "./SigningSlotDialog";
import B2cMessagesPanel from "./B2cMessagesPanel";

const TAG_TONE: Record<string, string> = {
  실행: "v4-tag-success",
  자서: "v4-tag-info",
  심사중: "v4-tag-neutral",
  재연락: "v4-tag-warning",
  지연: "v4-tag-danger",
  신규: "v4-tag-warning",
  미상담: "v4-tag-danger",
};

function splitAddress(label?: string) {
  if (!label) return { dongHo: "", complex: "" };
  const parts = label.split(/\s*·\s*/);
  return { dongHo: parts[0]?.trim() ?? "", complex: parts[1]?.trim() ?? "" };
}

function formatMoney(n?: number) {
  if (n == null) return "";
  return n.toLocaleString("ko-KR") + "원";
}

function extractSpouse(internalNote?: string): string | undefined {
  if (!internalNote) return undefined;
  const m = internalNote.match(/배우자[:\s]*([0-9-]+)/);
  return m?.[1];
}

function formatExecutionDate(s?: string): string {
  if (!s) return "";
  const iso = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return `${parseInt(iso[1], 10)}월 ${parseInt(iso[2], 10)}일`;
  return s;
}

function KV({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <>
      <dt
        style={{
          fontSize: 11.5,
          color: "var(--v4-text-tertiary)",
          fontWeight: 400,
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: 12.5,
          color: "var(--v4-text-primary)",
          fontWeight: 400,
          margin: 0,
        }}
      >
        {children}
      </dd>
    </>
  );
}

export function InboxDetail({
  task,
  done,
  onOpenWizard,
  onSms,
  onCall,
  onComplete,
}: {
  task: TaskItem;
  done?: boolean;
  onOpenWizard: () => void;
  onSms: () => void;
  onCall: () => void;
  onComplete: () => void;
}) {
  const { dongHo, complex } = splitAddress(task.addressLabel);
  const tagClass = task.tag ? TAG_TONE[task.tag] ?? "v4-tag-neutral" : "v4-tag-neutral";
  const spouse = extractSpouse(task.internalNote);
  const customerPhone = task.phones?.[0] ?? task.phone;
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);

  // Derive "지금 할 일" body from nextAction + funds context
  const taskTitle = task.nextAction.split("—")[0]?.trim() ?? task.nextAction;
  const taskBody = (() => {
    if (task.fundsAmount && task.fundsStatus === "pending") {
      return `필요자금 ${formatMoney(task.fundsAmount)}에 대한 고객 입금 대기 중. 자서 완료 상태 — ${task.time ?? ""} 실행 마감 필요.`;
    }
    if ((task.tag === "자서" || task.tag === "자서예약") && task.signingDateLabel) {
      return `${task.signingDateLabel} 자서 예정. ${task.signingPlace ?? ""}`;
    }
    if (task.tag === "신규" || task.tag === "미상담") {
      return `${task.time ?? ""} 접수 — 최초 상담 연락 필요. 고객에게 직접 컨택해 일정 협의.`;
    }
    return task.note ?? task.nextAction;
  })();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: "28px 32px",
        height: "100%",
        overflowY: "auto",
        background: "var(--v4-bg-primary)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.4px",
              color: "var(--v4-text-primary)",
              margin: 0,
              lineHeight: 1.2,
              textDecoration: done ? "line-through" : "none",
              opacity: done ? 0.55 : 1,
            }}
          >
            {task.customerName}
          </h2>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--v4-text-tertiary)",
              flexWrap: "wrap",
            }}
          >
            <span className="v4-tabular">{dongHo}</span>
            {task.size ? (
              <>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{task.size}타입</span>
              </>
            ) : null}
            {complex ? (
              <>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{complex}</span>
              </>
            ) : null}
          </div>
        </div>
        {task.tag ? (
          <span className={`v4-tag ${tagClass}`} style={{ flexShrink: 0 }}>
            {task.time && task.urgency === "critical"
              ? `${task.time} · 오늘 마감`
              : task.tag}
          </span>
        ) : null}
      </header>

      {/* "지금 할 일" box */}
      <section
        style={{
          padding: "14px 16px",
          background: "var(--v4-bg-secondary)",
          border: "1px solid var(--v4-border-light)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 500,
            color: "var(--v4-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <ClipboardList size={12} strokeWidth={1.8} />
          지금 할 일
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--v4-text-primary)",
            letterSpacing: "-0.1px",
          }}
        >
          {taskTitle}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--v4-text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {taskBody}
        </div>
      </section>

      {/* KV grid */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "100px minmax(0, 1fr)",
          rowGap: 12,
          columnGap: 18,
          margin: 0,
        }}
      >
        {task.legalAgent ? (
          <KV label="법무사">{task.legalAgent}</KV>
        ) : null}
        {customerPhone ? <KV label="고객 연락처">{customerPhone}</KV> : null}
        {task.phones && task.phones[1] ? (
          <KV label="추가 연락처">{task.phones[1]}</KV>
        ) : null}
        {spouse ? <KV label="배우자">{spouse}</KV> : null}
        {task.executionDate ? <KV label="실행 예정일">{formatExecutionDate(task.executionDate)}</KV> : null}
        {task.moveInDate ? <KV label="입주 예정일">{task.moveInDate}</KV> : null}
        {task.loanAmount ? <KV label="대출액">{formatMoney(task.loanAmount)}</KV> : null}
        {task.fundsAmount ? (
          <KV label="필요자금">
            <span className="v4-tabular" style={{ fontWeight: 500 }}>
              {formatMoney(task.fundsAmount)}
            </span>
          </KV>
        ) : null}
        {task.signingDateLabel ? <KV label="자서 일정">{task.signingDateLabel}</KV> : null}
        {task.signingPlace ? <KV label="자서 장소">{task.signingPlace}</KV> : null}
        {task.assignee ? <KV label="담당자">{task.assignee}</KV> : null}
      </dl>

      {/* Actions */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          gap: 8,
          paddingTop: 16,
          borderTop: "1px solid var(--v4-border-light)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onOpenWizard}
          className="v4-detail-action v4-detail-primary"
        >
          <ExternalLink size={13} strokeWidth={2} />
          위저드 열기
          <kbd className="v4-kbd" style={{ marginLeft: 4 }}>↵</kbd>
        </button>
        <button type="button" onClick={() => setSlotDialogOpen(true)} className="v4-detail-action">
          <CalendarClock size={13} strokeWidth={1.8} />
          자서 일정 (B2C)
        </button>
        <button type="button" onClick={onSms} className="v4-detail-action">
          <MessageSquare size={13} strokeWidth={1.8} />
          SMS
          <kbd className="v4-kbd" style={{ marginLeft: 4 }}>m</kbd>
        </button>
        <button type="button" onClick={onCall} className="v4-detail-action">
          <Phone size={13} strokeWidth={1.8} />
          전화
          <kbd className="v4-kbd" style={{ marginLeft: 4 }}>c</kbd>
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="v4-detail-action v4-detail-complete"
          data-done={done ? "true" : undefined}
        >
          <Check size={13} strokeWidth={2} />
          {done ? "완료 취소" : "완료"}
          <kbd className="v4-kbd" style={{ marginLeft: 4 }}>e</kbd>
        </button>
      </div>

      {/* 입주민 메시지 패널 (B2C 양방향) */}
      <div style={{ marginTop: 12 }}>
        <B2cMessagesPanel consultationId={task.id} byName={task.assignee} />
      </div>

      {/* 자서 일정 슬롯 다이얼로그 (B2C 양방향 워크플로) */}
      <SigningSlotDialog
        consultationId={task.id}
        open={slotDialogOpen}
        onClose={() => setSlotDialogOpen(false)}
      />

      <style>{`
        .v4-detail-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--v4-text-secondary);
          background: var(--v4-bg-primary);
          border: 1px solid var(--v4-border-primary);
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
        }
        .v4-detail-action:hover {
          background: var(--v4-bg-tertiary);
          color: var(--v4-text-primary);
        }
        .v4-detail-primary {
          color: #fff;
          background: var(--v4-info);
          border-color: transparent;
        }
        .v4-detail-primary:hover {
          background: #1d4ed8;
          color: #fff;
        }
        .v4-detail-complete {
          margin-left: auto;
          color: var(--v4-text-success);
          background: var(--v4-bg-success);
          border-color: var(--v4-border-success);
        }
        .v4-detail-complete:hover {
          background: #dcfce7;
          color: var(--v4-text-success);
        }
        .v4-detail-complete[data-done="true"] {
          color: var(--v4-text-tertiary);
          background: var(--v4-bg-secondary);
          border-color: var(--v4-border-primary);
        }
      `}</style>
    </div>
  );
}
