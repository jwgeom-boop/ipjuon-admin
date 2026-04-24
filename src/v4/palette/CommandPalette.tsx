import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, UserPlus, Calendar, List, BarChart3, FileText } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";
import { ALL_TASKS } from "../data/samples";

const STATIC_COMMANDS: {
  id: string;
  label: string;
  hint?: string;
  keywords: string[];
  icon: typeof UserPlus;
  path: string;
  query?: string;
}[] = [
  {
    id: "inbox",
    label: "오늘의 인박스",
    hint: "메인 화면으로 이동",
    keywords: ["home", "inbox", "home inbox", "인박스", "홈", "메인"],
    icon: List,
    path: "/v4",
  },
  {
    id: "filter-urgent",
    label: "긴급 건만 보기",
    hint: "인박스 필터 — 긴급",
    keywords: ["urgent", "긴급", "critical"],
    icon: List,
    path: "/v4?category=all",
    query: "urgent",
  },
  {
    id: "filter-signing",
    label: "자서예약 목록",
    hint: "인박스 필터 — 자서",
    keywords: ["signing", "자서", "서명"],
    icon: Calendar,
    path: "/v4?category=signing",
  },
  {
    id: "filter-execution",
    label: "실행예정 목록",
    hint: "인박스 필터 — 실행",
    keywords: ["execution", "실행", "대출실행"],
    icon: BarChart3,
    path: "/v4?category=execution",
  },
  {
    id: "filter-inbox",
    label: "신규·미상담 목록",
    hint: "인박스 필터 — 신규",
    keywords: ["new", "inbox", "신규", "미상담"],
    icon: UserPlus,
    path: "/v4?category=inbox",
  },
  {
    id: "filter-done",
    label: "완료 목록",
    hint: "오늘 완료 처리한 건",
    keywords: ["done", "완료", "complete"],
    icon: FileText,
    path: "/v4?category=done",
  },
];

function wizardPath(task: TaskItem): string {
  const tag = task.tag ?? "";
  if (tag === "신규" || tag === "미상담" || tag === "재연락") {
    return `/v4/wizard/consultation/${task.id}`;
  }
  if (tag === "자서" || tag === "지연") {
    return `/v4/wizard/signing/${task.id}`;
  }
  return `/v4/wizard/execution/${task.id}`;
}

type Match =
  | { kind: "task"; task: TaskItem; path: string }
  | { kind: "command"; id: string; label: string; hint?: string; path: string; icon: typeof UserPlus };

function fuzzyMatch(hay: string, needle: string): boolean {
  if (!needle) return true;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const matches = useMemo<Match[]>(() => {
    const needle = q.trim();
    const taskMatches: Match[] = ALL_TASKS.filter((t) => {
      const hay = [
        t.customerName,
        t.addressLabel,
        t.assignee,
        t.phone,
        ...(t.phones ?? []),
        t.tag,
        t.nextAction,
      ]
        .filter(Boolean)
        .join(" ");
      return fuzzyMatch(hay, needle);
    })
      .slice(0, 20)
      .map((task) => ({ kind: "task" as const, task, path: wizardPath(task) }));

    const cmdMatches: Match[] = STATIC_COMMANDS.filter((c) => {
      if (!needle) return true;
      const hay = [c.label, c.hint ?? "", ...c.keywords].join(" ");
      return fuzzyMatch(hay, needle);
    }).map((c) => ({
      kind: "command" as const,
      id: c.id,
      label: c.label,
      hint: c.hint,
      path: c.path,
      icon: c.icon,
    }));

    return needle ? [...taskMatches, ...cmdMatches] : [...cmdMatches, ...taskMatches];
  }, [q]);

  useEffect(() => {
    if (idx >= matches.length) setIdx(Math.max(0, matches.length - 1));
  }, [matches.length, idx]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(matches.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const m = matches[idx];
        if (m) {
          navigate(m.path);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, matches, idx, navigate, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        style={{
          width: "min(640px, 92vw)",
          background: "var(--v4-bg-primary)",
          border: "1px solid var(--v4-border-secondary)",
          borderRadius: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid var(--v4-border-light)",
          }}
        >
          <Search size={14} strokeWidth={2} color="var(--v4-text-tertiary)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            placeholder="고객·페이지·작업 검색…"
            style={{
              flex: 1,
              fontSize: 14,
              padding: "3px 0",
              color: "var(--v4-text-primary)",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <kbd className="v4-kbd">ESC</kbd>
        </div>

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 6,
          }}
        >
          {matches.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                fontSize: 12,
                color: "var(--v4-text-tertiary)",
              }}
            >
              일치하는 항목이 없습니다.
            </div>
          ) : (
            matches.map((m, i) => {
              const active = i === idx;
              if (m.kind === "task") {
                return (
                  <button
                    key={`t-${m.task.id}`}
                    data-idx={i}
                    type="button"
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => {
                      navigate(m.path);
                      onClose();
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "16px 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 10px",
                      border: "none",
                      borderRadius: 6,
                      background: active ? "var(--v4-bg-info)" : "transparent",
                      color: "var(--v4-text-primary)",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <UserPlus size={13} strokeWidth={1.8} color="var(--v4-text-tertiary)" />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--v4-text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.task.customerName}
                        {m.task.tag ? (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10.5,
                              fontWeight: 400,
                              color: "var(--v4-text-tertiary)",
                            }}
                          >
                            · {m.task.tag}
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--v4-text-tertiary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.task.addressLabel}
                        {m.task.assignee ? ` · ${m.task.assignee}` : ""}
                      </div>
                    </div>
                    {active ? (
                      <ArrowRight size={12} strokeWidth={1.8} color="var(--v4-text-tertiary)" />
                    ) : (
                      <span style={{ width: 12 }} />
                    )}
                  </button>
                );
              }
              const Icon = m.icon;
              return (
                <button
                  key={`c-${m.id}`}
                  data-idx={i}
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => {
                    navigate(m.path);
                    onClose();
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "16px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 10px",
                    border: "none",
                    borderRadius: 6,
                    background: active ? "var(--v4-bg-info)" : "transparent",
                    color: "var(--v4-text-primary)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Icon size={13} strokeWidth={1.8} color="var(--v4-text-tertiary)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--v4-text-primary)" }}>
                      {m.label}
                    </div>
                    {m.hint ? (
                      <div style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>{m.hint}</div>
                    ) : null}
                  </div>
                  {active ? (
                    <ArrowRight size={12} strokeWidth={1.8} color="var(--v4-text-tertiary)" />
                  ) : (
                    <span style={{ width: 12 }} />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderTop: "1px solid var(--v4-border-light)",
            fontSize: 11,
            color: "var(--v4-text-tertiary)",
            background: "var(--v4-bg-secondary)",
          }}
        >
          <span>
            <kbd className="v4-kbd">↑</kbd>
            <kbd className="v4-kbd" style={{ marginLeft: 3 }}>↓</kbd> 이동
            <kbd className="v4-kbd" style={{ marginLeft: 10 }}>↵</kbd> 열기
          </span>
          <span>
            <kbd className="v4-kbd">⌘</kbd>
            <kbd className="v4-kbd" style={{ marginLeft: 3 }}>K</kbd> 토글
          </span>
        </div>
      </div>
    </div>
  );
}
