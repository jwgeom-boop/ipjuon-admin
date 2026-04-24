import { useMemo } from "react";
import { Clock, ChevronRight, FileSignature, Wallet } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";

type Props = {
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  // fill: 부모 flex/grid 셀 높이를 채우고 본문이 넘치면 내부 스크롤.
  fill?: boolean;
};

type TimelineRow = {
  task: TaskItem;
  kind: "signing" | "execution";
  hour: number;
  minute: number;
  timeLabel: string;
};

function parseTimeOfDay(task: TaskItem): { h: number; m: number; label: string } | null {
  const candidates = [task.time, task.signingSlot, task.signingDateLabel].filter(
    Boolean,
  ) as string[];
  for (const raw of candidates) {
    const ampm = /오전/.test(raw) ? "am" : /오후/.test(raw) ? "pm" : null;
    const m = raw.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
    if (!m) continue;
    let h = parseInt(m[1], 10);
    const mn = m[2] ? parseInt(m[2], 10) : 0;
    if (Number.isNaN(h) || Number.isNaN(mn) || h > 23 || mn > 59) continue;
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    const label = `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
    return { h, m: mn, label };
  }
  return null;
}

function isSigningToday(t: TaskItem) {
  return t.tag === "자서";
}
function isExecutionToday(t: TaskItem) {
  return t.tag === "실행";
}

export function TodayTimeline({ tasks, onSelectTask, fill }: Props) {
  const rows = useMemo<TimelineRow[]>(() => {
    const out: TimelineRow[] = [];
    tasks.forEach((t) => {
      const kind: TimelineRow["kind"] | null = isSigningToday(t)
        ? "signing"
        : isExecutionToday(t)
          ? "execution"
          : null;
      if (!kind) return;
      const parsed = parseTimeOfDay(t);
      out.push({
        task: t,
        kind,
        hour: parsed?.h ?? 99,
        minute: parsed?.m ?? 99,
        timeLabel: parsed?.label ?? "시간 미정",
      });
    });
    return out.sort((a, b) => a.hour - b.hour || a.minute - b.minute);
  }, [tasks]);

  const nowMin = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const nextIdx = rows.findIndex((r) => r.hour * 60 + r.minute >= nowMin);

  return (
    <section
      style={{
        background: "var(--v4-bg-secondary)",
        border: "1px solid var(--v4-border-light)",
        borderRadius: 8,
        padding: 14,
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : {}),
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <Clock size={15} strokeWidth={2} style={{ color: "var(--v4-text-tertiary)" }} />
        <h2
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          오늘 일정
        </h2>
        <span
          className="v4-tabular"
          style={{ fontSize: 12.5, color: "var(--v4-text-tertiary)" }}
        >
          자서 {rows.filter((r) => r.kind === "signing").length} · 실행{" "}
          {rows.filter((r) => r.kind === "execution").length}
        </span>
      </header>

      {rows.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--v4-text-tertiary)",
            padding: "20px 8px",
            textAlign: "center",
          }}
        >
          오늘 자서·실행 일정 없음
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            ...(fill ? { flex: 1, minHeight: 0, overflowY: "auto" } : {}),
          }}
        >
          {rows.map((r, idx) => {
            const isNext = idx === nextIdx;
            const isPast = r.hour * 60 + r.minute < nowMin;
            // 우선순위 시각화: NEXT는 좌측 보더 + bg-info, 임박(다음 1시간 이내) 항목은 warning 보더
            const minutesUntil = r.hour * 60 + r.minute - nowMin;
            const isImminent = !isPast && !isNext && minutesUntil >= 0 && minutesUntil <= 60;
            const accentColor = isNext
              ? "var(--v4-info)"
              : isImminent
              ? "var(--v4-warning)"
              : "transparent";
            const restingBg = isNext ? "var(--v4-bg-info)" : "transparent";
            return (
              <li key={r.task.id}>
                <button
                  type="button"
                  onClick={() => onSelectTask(r.task)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 26px minmax(0, 1fr) auto 14px",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px 8px 14px 11px",
                    background: restingBg,
                    border: "none",
                    borderLeft: `3px solid ${accentColor}`,
                    borderTop: idx === 0 ? "none" : "1px solid var(--v4-border-light)",
                    borderRadius: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    opacity: isPast && !isNext ? 0.55 : 1,
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isNext)
                      e.currentTarget.style.background = "var(--v4-bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isNext) e.currentTarget.style.background = restingBg;
                  }}
                >
                  <span
                    className="v4-tabular"
                    style={{
                      fontSize: isNext ? 14.5 : 14,
                      fontWeight: isNext ? 700 : isImminent ? 650 : 600,
                      color: isNext
                        ? "var(--v4-text-info)"
                        : isImminent
                        ? "var(--v4-text-warning)"
                        : "var(--v4-text-primary)",
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {r.timeLabel}
                  </span>
                  <span
                    title={r.kind === "signing" ? "자서" : "실행"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 5,
                      background:
                        r.kind === "signing"
                          ? "var(--v4-bg-warning)"
                          : "var(--v4-bg-success)",
                      color:
                        r.kind === "signing" ? "var(--v4-warning)" : "var(--v4-success)",
                    }}
                  >
                    {r.kind === "signing" ? (
                      <FileSignature size={14} strokeWidth={2} />
                    ) : (
                      <Wallet size={14} strokeWidth={2} />
                    )}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--v4-text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {r.task.customerName}
                      {r.task.assignee ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--v4-text-tertiary)",
                          }}
                        >
                          · {r.task.assignee}
                        </span>
                      ) : null}
                      {isNext ? (
                        <span
                          style={{
                            marginLeft: 7,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: "var(--v4-text-info)",
                            color: "#fff",
                            letterSpacing: 0.3,
                            verticalAlign: "middle",
                          }}
                        >
                          NEXT
                        </span>
                      ) : null}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12.5,
                        color: "var(--v4-text-tertiary)",
                        marginTop: 3,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.task.signingPlace ?? r.task.addressLabel}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "var(--v4-text-secondary)",
                      whiteSpace: "nowrap",
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.task.nextAction}
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    style={{ color: "var(--v4-text-tertiary)" }}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
