import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import type { TaskItem } from "./TaskRow";

const LAST_SEEN_KEY = "ipjuon_inbox_last_seen_v1";

interface ResidentAction {
  taskId: string;
  customerName: string;
  bankName: string;
  actionType: string;  // "accept" | "cancel" | "signing_select" | "report_middle_interest" | "doc_checks"
  actionAt: string;    // ISO
}

interface Props {
  /** TaskRow 변환 데이터 안에 resident_last_action_at / type 가 매핑되어 들어와야 함 */
  tasks: TaskItem[];
  /** 클릭 시 해당 상담건 선택 */
  onSelect: (taskId: string) => void;
}

const ACTION_LABEL: Record<string, { emoji: string; text: string; color: string }> = {
  accept:                  { emoji: "🎉", text: "가심사 결과 수용",   color: "#16a34a" },
  cancel:                  { emoji: "❌", text: "취소 요청",          color: "#dc2626" },
  signing_select:          { emoji: "📅", text: "자서 일정 선택",     color: "#1d4ed8" },
  report_middle_interest:  { emoji: "💰", text: "중도금이자 보고",   color: "#d97706" },
  doc_checks:              { emoji: "📋", text: "준비서류 체크",     color: "#0891b2" },
  message:                 { emoji: "💬", text: "메시지 도착",       color: "#7c3aed" },
};

const formatRel = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** 상담사 사이트 알림함 — 입주민 액션 발생 시 종 아이콘 + 빨간 카운트 */
export default function NotificationBell({ tasks, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(LAST_SEEN_KEY) || "0", 10); } catch { return 0; }
  });
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // tasks 에서 resident_last_action_at 추출
  const actions = useMemo<ResidentAction[]>(() => {
    return tasks
      .filter(t => t.residentLastActionAt)
      .map(t => ({
        taskId: t.id,
        customerName: t.customerName,
        bankName: t.bankName ?? t.assignee ?? "",
        actionType: t.residentLastActionType ?? "unknown",
        actionAt: t.residentLastActionAt as string,
      }))
      .sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime());
  }, [tasks]);

  const unreadCount = actions.filter(a => new Date(a.actionAt).getTime() > lastSeen).length;

  const markAllSeen = () => {
    const now = Date.now();
    try { localStorage.setItem(LAST_SEEN_KEY, String(now)); } catch {}
    setLastSeen(now);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="입주민 액션 알림"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          padding: 7,
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: 6,
          cursor: "pointer",
          color: "var(--v4-text-secondary)",
        }}
      >
        <Bell size={16} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            background: "#dc2626",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          width: 360,
          maxHeight: 480,
          background: "white",
          border: "1px solid var(--v4-border-tertiary)",
          borderRadius: 10,
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--v4-border-tertiary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>🔔 입주민 액션 알림</p>
              <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                미확인 {unreadCount}건 / 전체 {actions.length}건
              </p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllSeen} style={{
                fontSize: 11,
                color: "var(--v4-text-secondary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}>
                <CheckCheck size={11} /> 모두 읽음
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {actions.length === 0 ? (
              <p style={{ padding: 28, fontSize: 12, color: "#9ca3af", textAlign: "center", margin: 0 }}>
                아직 입주민 액션이 없습니다
              </p>
            ) : (
              actions.slice(0, 30).map(a => {
                const meta = ACTION_LABEL[a.actionType] ?? { emoji: "📌", text: a.actionType, color: "var(--v4-text-secondary)" };
                const unread = new Date(a.actionAt).getTime() > lastSeen;
                return (
                  <button
                    key={a.taskId + a.actionAt}
                    onClick={() => { onSelect(a.taskId); setOpen(false); markAllSeen(); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--v4-border-tertiary)",
                      background: unread ? "rgba(59, 130, 246, 0.05)" : "white",
                      border: "none",
                      borderLeft: unread ? "3px solid #1d4ed8" : "3px solid transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{meta.emoji}</span>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: unread ? 700 : 600, color: meta.color }}>
                        {meta.text}
                      </p>
                      {unread && <span style={{ width: 6, height: 6, borderRadius: 999, background: "#1d4ed8" }} />}
                    </div>
                    <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "var(--v4-text-primary)", fontWeight: 500 }}>
                      {a.customerName} <span style={{ color: "var(--v4-text-tertiary)", fontWeight: 400 }}>· {a.bankName}</span>
                    </p>
                    <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                      {formatRel(a.actionAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
