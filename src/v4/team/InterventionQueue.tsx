import { useMemo } from "react";
import { AlertTriangle, UserX, ChevronRight, Clock3 } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";
import { diffDaysFromToday, formatDday } from "../lib/dday";

type Group = "delayed" | "critical" | "inactiveOwner" | "executionD1";

type Row = {
  task: TaskItem;
  group: Group;
  label: string;
  reason: string;
};

type Props = {
  tasks: TaskItem[];
  isInactive: (name: string) => boolean;
  onSelectTask: (t: TaskItem) => void;
  // fill: stretch to parent flex column height, list scrolls internally.
  fill?: boolean;
};

const GROUP_ORDER: Record<Group, number> = {
  inactiveOwner: 0,
  executionD1: 1,
  delayed: 2,
  critical: 3,
};

const GROUP_META: Record<
  Group,
  { color: string; bg: string; icon: React.ReactNode; title: string }
> = {
  inactiveOwner: {
    color: "var(--v4-danger)",
    bg: "var(--v4-bg-danger)",
    icon: <UserX size={13} strokeWidth={2} />,
    title: "비활성 담당자",
  },
  executionD1: {
    color: "var(--v4-danger)",
    bg: "var(--v4-bg-danger)",
    icon: <Clock3 size={13} strokeWidth={2} />,
    title: "실행 임박",
  },
  delayed: {
    color: "var(--v4-danger)",
    bg: "var(--v4-bg-danger)",
    icon: <AlertTriangle size={13} strokeWidth={2} />,
    title: "지연",
  },
  critical: {
    color: "var(--v4-warning)",
    bg: "var(--v4-bg-warning)",
    icon: <AlertTriangle size={13} strokeWidth={2} />,
    title: "긴급",
  },
};

export function InterventionQueue({ tasks, isInactive, onSelectTask, fill }: Props) {
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const seen = new Set<string>();
    const push = (task: TaskItem, group: Group, label: string, reason: string) => {
      if (seen.has(task.id)) return;
      seen.add(task.id);
      out.push({ task, group, label, reason });
    };

    tasks.forEach((t) => {
      const owner = (t.assignee ?? "").trim();
      if (owner && isInactive(owner)) {
        push(t, "inactiveOwner", "재배정 필요", `담당자 ${owner} 비활성`);
        return;
      }
      const diff = diffDaysFromToday(t.executionDate);
      if (diff != null && diff <= 1) {
        const reason =
          diff < 0
            ? "실행일 경과 — 즉시 확인"
            : diff === 0
              ? "오늘 실행"
              : "내일 실행";
        push(t, "executionD1", formatDday(diff), reason);
        return;
      }
      if (t.tag === "지연") {
        push(t, "delayed", "지연", "처리 지연 상태");
        return;
      }
      if (t.urgency === "critical") {
        push(t, "critical", "긴급", "긴급(critical) 표시");
        return;
      }
    });

    return out.sort((a, b) => {
      const g = GROUP_ORDER[a.group] - GROUP_ORDER[b.group];
      if (g !== 0) return g;
      if (a.group === "executionD1") {
        const da = diffDaysFromToday(a.task.executionDate) ?? 999;
        const db = diffDaysFromToday(b.task.executionDate) ?? 999;
        return da - db;
      }
      return 0;
    });
  }, [tasks, isInactive]);

  return (
    <section
      id="team-intervention-queue"
      style={{
        background: "var(--v4-bg-secondary)",
        border: "1px solid var(--v4-border-light)",
        borderRadius: 8,
        padding: 14,
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
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
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "var(--v4-bg-danger)",
            color: "var(--v4-danger)",
          }}
        >
          <AlertTriangle size={13} strokeWidth={2} />
        </span>
        <h2
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          내가 챙길 것
        </h2>
        <span
          className="v4-tabular"
          style={{ fontSize: 12.5, color: "var(--v4-text-tertiary)" }}
        >
          {rows.length}건
        </span>
      </header>

      <div
        style={
          fill
            ? { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }
            : undefined
        }
      >
      {rows.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--v4-text-tertiary)",
            padding: "20px 8px",
            textAlign: "center",
          }}
        >
          개입 필요 항목 없음
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((r, idx) => {
            const meta = GROUP_META[r.group];
            // 우선순위 시각화: 모든 개입필요 항목은 좌측 보더 + 미세한 배경 톤
            const restingBg = meta.bg;
            return (
              <li key={r.task.id}>
                <button
                  type="button"
                  onClick={() => onSelectTask(r.task)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr) auto 14px",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "13px 6px 13px 9px",
                    background: restingBg,
                    border: "none",
                    borderLeft: `3px solid ${meta.color}`,
                    borderTop:
                      idx === 0 ? "none" : "1px solid var(--v4-border-light)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--v4-bg-tertiary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = restingBg)
                  }
                >
                  <span
                    title={meta.title}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 5,
                      background: meta.bg,
                      color: meta.color,
                    }}
                  >
                    {meta.icon}
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
                      {r.reason} · {r.task.addressLabel}
                    </span>
                  </span>
                  <span
                    className="v4-tabular"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: meta.bg,
                      color: meta.color,
                      letterSpacing: 0.3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.label}
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
      </div>
    </section>
  );
}
