import { ReactNode } from "react";
import { CheckCircle2, RotateCcw, Phone } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";

function splitAddress(label?: string) {
  if (!label) return { dongHo: "", complex: "" };
  const parts = label.split(/\s*·\s*/);
  return { dongHo: parts[0]?.trim() ?? "", complex: parts[1]?.trim() ?? "" };
}

function formatMoney(n?: number) {
  if (n == null) return "";
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(s?: string): string {
  if (!s) return "";
  const iso = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return `${parseInt(iso[1], 10)}월 ${parseInt(iso[2], 10)}일`;
  return s;
}

function extractSpouse(internalNote?: string): string | undefined {
  if (!internalNote) return undefined;
  const m = internalNote.match(/배우자[:\s]*([0-9-]+)/);
  return m?.[1];
}

// 완료 시점에 도달한 단계 라벨 — tag 기반 추정
function finalStageLabel(task: TaskItem): string {
  const tag = task.tag ?? "";
  if (tag.includes("실행")) return "실행 완료";
  if (tag.includes("자서")) return "자서 완료";
  if (tag.includes("예약")) return "자서예약 완료";
  if (tag.includes("심사") || tag.includes("상담")) return "상담 완료";
  return "처리 완료";
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

export function CompletedDetail({
  task,
  onUndoComplete,
  onCall,
}: {
  task: TaskItem;
  onUndoComplete: () => void;
  onCall: () => void;
}) {
  const { dongHo, complex } = splitAddress(task.addressLabel);
  const spouse = extractSpouse(task.internalNote);
  const customerPhone = task.phones?.[0] ?? task.phone;
  const stageLabel = finalStageLabel(task);

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
              textDecoration: "line-through",
              opacity: 0.55,
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
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--v4-text-success)",
            background: "var(--v4-bg-success)",
            border: "1px solid var(--v4-border-success)",
            borderRadius: 999,
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={13} strokeWidth={2} />
          {stageLabel}
        </span>
      </header>

      {/* 결과 요약 */}
      <section
        style={{
          padding: "14px 16px",
          background: "var(--v4-bg-secondary)",
          border: "1px solid var(--v4-border-light)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--v4-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          결과 요약
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--v4-text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {task.note ?? task.nextAction ?? "추가 메모 없음"}
        </div>
      </section>

      {/* 핵심 데이터 */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "100px minmax(0, 1fr)",
          rowGap: 12,
          columnGap: 18,
          margin: 0,
        }}
      >
        {customerPhone ? <KV label="고객 연락처">{customerPhone}</KV> : null}
        {task.phones && task.phones[1] ? (
          <KV label="추가 연락처">{task.phones[1]}</KV>
        ) : null}
        {spouse ? <KV label="배우자">{spouse}</KV> : null}
        {task.signingDateLabel ? <KV label="자서 일정">{task.signingDateLabel}</KV> : null}
        {task.signingPlace ? <KV label="자서 장소">{task.signingPlace}</KV> : null}
        {task.executionDate ? <KV label="실행일">{formatDate(task.executionDate)}</KV> : null}
        {task.loanAmount ? <KV label="대출액">{formatMoney(task.loanAmount)}</KV> : null}
        {task.additionalLoan ? <KV label="추가대출">{formatMoney(task.additionalLoan)}</KV> : null}
        {task.fundsAmount ? (
          <KV label="필요자금">
            <span className="v4-tabular" style={{ fontWeight: 500 }}>
              {formatMoney(task.fundsAmount)}
            </span>
          </KV>
        ) : null}
        {task.legalAgent ? <KV label="법무사">{task.legalAgent}</KV> : null}
        {task.assignee ? <KV label="담당자">{task.assignee}</KV> : null}
      </dl>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          gap: 8,
          paddingTop: 16,
          borderTop: "1px solid var(--v4-border-light)",
        }}
      >
        {customerPhone ? (
          <button type="button" onClick={onCall} className="v4-completed-action">
            <Phone size={13} strokeWidth={1.8} />
            전화
          </button>
        ) : null}
        <button
          type="button"
          onClick={onUndoComplete}
          className="v4-completed-action v4-completed-undo"
        >
          <RotateCcw size={13} strokeWidth={1.8} />
          완료 취소
        </button>
      </div>

      <style>{`
        .v4-completed-action {
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
        .v4-completed-action:hover {
          background: var(--v4-bg-tertiary);
          color: var(--v4-text-primary);
        }
        .v4-completed-undo {
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
