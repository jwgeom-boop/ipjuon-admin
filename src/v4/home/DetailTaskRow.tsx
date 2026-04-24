import { ChevronDown, ChevronRight, MapPin, Wallet, FileText, CalendarClock, UserPlus } from "lucide-react";
import { MouseEvent, useState } from "react";
import { UrgencyMark } from "../components/UrgencyMark";
import type { TaskItem, NoticeStatus, FundsStatus } from "./TaskRow";

const TAG_TONE: Record<string, string> = {
  실행: "v4-tag-success",
  자서: "v4-tag-info",
};

const NOTICE_LABEL: Record<NoticeStatus, string> = {
  unsent: "안내 미발송",
  sent: "안내 완료",
  confirmed: "회신 OK",
};

const NOTICE_TONE: Record<NoticeStatus, { bg: string; color: string }> = {
  unsent: { bg: "var(--v4-bg-danger)", color: "var(--v4-danger)" },
  sent: { bg: "var(--v4-bg-secondary)", color: "var(--v4-text-secondary)" },
  confirmed: { bg: "var(--v4-bg-success)", color: "var(--v4-success)" },
};

const FUNDS_LABEL: Record<FundsStatus, string> = {
  pending: "입금 대기",
  received: "입금 확인",
  settled: "정산 완료",
};

const FUNDS_TONE: Record<FundsStatus, { bg: string; color: string }> = {
  pending: { bg: "var(--v4-bg-warning)", color: "var(--v4-warning)" },
  received: { bg: "var(--v4-bg-info)", color: "var(--v4-info)" },
  settled: { bg: "var(--v4-bg-success)", color: "var(--v4-success)" },
};

const formatWon = (n: number) => n.toLocaleString("ko-KR");

export function DetailTaskRow({
  task,
  variant,
  onOpen,
}: {
  task: TaskItem;
  variant: "signing" | "execution";
  onOpen?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tagClass = task.tag ? TAG_TONE[task.tag] ?? "v4-tag-neutral" : "v4-tag-neutral";

  const docTotal = task.documents?.length ?? 0;
  const docDone = task.documents?.filter((d) => d.received).length ?? 0;
  const docPending = docTotal - docDone;

  const cpTotal = task.checkpoints?.length ?? 0;
  const cpDone = task.checkpoints?.filter((c) => c.done).length ?? 0;
  const nextStep = task.checkpoints?.find((c) => !c.done)?.label;

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  const handleRowClick = () => onOpen?.(task.id);

  return (
    <div
      className={`v4-detail-row is-${task.urgency}`}
      style={{
        borderRadius: "var(--v4-radius-md)",
        background: expanded ? "var(--v4-bg-secondary)" : "transparent",
        transition: "background 140ms",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "16px 1fr auto auto auto 22px",
          gap: 12,
          alignItems: "center",
          width: "100%",
          minHeight: 44,
          padding: "6px 8px 6px 14px",
          borderRadius: "var(--v4-radius-md)",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "inline-flex", justifyContent: "center" }}>
          <UrgencyMark level={task.urgency} />
        </span>

        <div
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--v4-text-primary)" }}>
            {task.customerName}
          </span>
          {task.assignee ? (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--v4-text-tertiary)",
                padding: "1px 6px",
                borderRadius: 999,
                background: "var(--v4-bg-secondary)",
                border: "1px solid var(--v4-border-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {task.assignee}
            </span>
          ) : null}
          <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
            {task.addressLabel}
          </span>
          {variant === "signing" && task.signingSlot ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--v4-text-secondary)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <MapPin size={10} strokeWidth={1.8} />
              {task.signingSlot}
            </span>
          ) : null}
          {variant === "execution" && task.fundsAmount ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--v4-text-secondary)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Wallet size={10} strokeWidth={1.8} />
              {formatWon(task.fundsAmount)}원
            </span>
          ) : null}
        </div>

        {/* status mini-pill */}
        {variant === "signing" && task.noticeStatus ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 999,
              background: NOTICE_TONE[task.noticeStatus].bg,
              color: NOTICE_TONE[task.noticeStatus].color,
              whiteSpace: "nowrap",
            }}
          >
            {NOTICE_LABEL[task.noticeStatus]}
          </span>
        ) : variant === "signing" && docTotal > 0 ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 999,
              background: docPending > 0 ? "var(--v4-bg-warning)" : "var(--v4-bg-success)",
              color: docPending > 0 ? "var(--v4-warning)" : "var(--v4-success)",
              whiteSpace: "nowrap",
            }}
          >
            서류 {docDone}/{docTotal}
          </span>
        ) : variant === "execution" && task.fundsStatus ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: 999,
              background: FUNDS_TONE[task.fundsStatus].bg,
              color: FUNDS_TONE[task.fundsStatus].color,
              whiteSpace: "nowrap",
            }}
          >
            {FUNDS_LABEL[task.fundsStatus]}
          </span>
        ) : (
          <span />
        )}

        {task.tag ? <span className={`v4-tag ${tagClass}`}>{task.tag}</span> : <span />}

        {task.time ? (
          <span
            className="v4-tabular"
            style={{
              fontSize: 11,
              color: "var(--v4-text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            {task.time}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={handleToggle}
          aria-label={expanded ? "접기" : "펼치기"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            border: "1px solid var(--v4-border-tertiary)",
            background: "var(--v4-bg-primary)",
            borderRadius: 4,
            cursor: "pointer",
            color: "var(--v4-text-secondary)",
            fontFamily: "inherit",
          }}
        >
          {expanded ? (
            <ChevronDown size={12} strokeWidth={1.8} />
          ) : (
            <ChevronRight size={12} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {expanded ? (
        <div
          style={{
            padding: "8px 14px 12px 42px",
            borderTop: "1px dashed var(--v4-border-tertiary)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {variant === "signing" ? (
            <SigningDetail task={task} pending={docPending} />
          ) : (
            <ExecutionDetail
              task={task}
              cpDone={cpDone}
              cpTotal={cpTotal}
              nextStep={nextStep}
            />
          )}
        </div>
      ) : null}

      <style>{`
        .v4-detail-row:hover {
          background: var(--v4-bg-secondary);
        }
      `}</style>
    </div>
  );
}

function SigningDetail({ task, pending }: { task: TaskItem; pending: number }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 11.5,
          color: "var(--v4-text-secondary)",
          flexWrap: "wrap",
        }}
      >
        {task.signingPlace ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MapPin size={11} strokeWidth={1.8} />
            {task.signingPlace}
          </span>
        ) : null}
        {task.companion ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <UserPlus size={11} strokeWidth={1.8} />
            {task.companion}
          </span>
        ) : null}
        <span style={{ color: "var(--v4-text-tertiary)" }}>{task.nextAction}</span>
      </div>

      {task.documents && task.documents.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "var(--v4-bg-primary)",
            border: "1px solid var(--v4-border-tertiary)",
            borderRadius: 6,
            padding: "8px 10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10.5,
              color: "var(--v4-text-tertiary)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginBottom: 2,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <FileText size={11} strokeWidth={1.8} />
              지참서류
            </span>
            <span
              className="v4-tabular"
              style={{ color: pending > 0 ? "var(--v4-warning)" : "var(--v4-success)" }}
            >
              {pending > 0 ? `미수령 ${pending}건` : "전부 확인"}
            </span>
          </div>
          {task.documents.map((d) => (
            <div
              key={d.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: d.received ? "var(--v4-text-secondary)" : "var(--v4-text-primary)",
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  border: `1px solid ${d.received ? "var(--v4-success)" : "var(--v4-border-tertiary)"}`,
                  background: d.received ? "var(--v4-success)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                  lineHeight: 1,
                }}
              >
                {d.received ? "✓" : ""}
              </span>
              <span
                style={{
                  textDecoration: d.received ? "line-through" : "none",
                  textDecorationColor: "var(--v4-text-tertiary)",
                }}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ExecutionDetail({
  task,
  cpDone,
  cpTotal,
  nextStep,
}: {
  task: TaskItem;
  cpDone: number;
  cpTotal: number;
  nextStep?: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 11.5,
          color: "var(--v4-text-secondary)",
          flexWrap: "wrap",
        }}
      >
        {task.closingDate ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CalendarClock size={11} strokeWidth={1.8} />
            잔금 {task.closingDate}
          </span>
        ) : null}
        {task.legalAgent ? (
          <span style={{ color: "var(--v4-text-tertiary)" }}>법무사 {task.legalAgent}</span>
        ) : null}
        <span style={{ color: "var(--v4-text-tertiary)" }}>{task.nextAction}</span>
      </div>

      {task.checkpoints && task.checkpoints.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "var(--v4-bg-primary)",
            border: "1px solid var(--v4-border-tertiary)",
            borderRadius: 6,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10.5,
              color: "var(--v4-text-tertiary)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            <span>체크포인트</span>
            <span className="v4-tabular">
              {cpDone}/{cpTotal} {nextStep ? `· 다음: ${nextStep}` : "· 모두 완료"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cpTotal}, 1fr)`,
              gap: 4,
            }}
          >
            {task.checkpoints.map((c, idx) => {
              const isCurrent = !c.done && idx === cpDone;
              return (
                <div key={c.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: c.done
                        ? "var(--v4-success)"
                        : isCurrent
                          ? "var(--v4-info)"
                          : "var(--v4-bg-tertiary)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10.5,
                      color: c.done
                        ? "var(--v4-success)"
                        : isCurrent
                          ? "var(--v4-info)"
                          : "var(--v4-text-tertiary)",
                      fontWeight: c.done || isCurrent ? 600 : 400,
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
