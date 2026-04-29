import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Msg {
  id: string;
  from: "RESIDENT" | "CONSULTANT";
  by?: string;
  text: string;
  at: string;
}

interface Props {
  consultationId: string;
  /** 상담사 본인 표시명 (없으면 "상담사") */
  byName?: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const dDay = new Date(d); dDay.setHours(0,0,0,0);
  const isToday = dDay.getTime() === today.getTime();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (isToday) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
};

/** 상담사 사이트용 — InboxDetail 안에 임베드. 입주민과 메시지 주고받기. */
export default function B2cMessagesPanel({ consultationId, byName }: Props) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const reload = () => {
    setLoading(true);
    return api.getConsultationById(consultationId)
      .then((c: any) => {
        try {
          if (c.b2c_messages) setMessages(JSON.parse(c.b2c_messages));
          else setMessages([]);
        } catch { setMessages([]); }
      })
      .catch(() => toast.error("메시지 조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [consultationId]);

  // 새 메시지 도착 시 스크롤 맨 아래로
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const updated: any = await api.sendBankMessage(consultationId, t, byName);
      try {
        if (updated.b2c_messages) setMessages(JSON.parse(updated.b2c_messages));
      } catch {}
      setText("");
      toast.success("메시지 전송 (입주민 앱 푸시 발송)");
    } catch (e: any) {
      toast.error(e?.message || "전송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: "var(--v4-bg-primary)",
      border: "1px solid var(--v4-border-tertiary)",
      borderRadius: "var(--v4-radius-md)",
      display: "flex",
      flexDirection: "column",
      maxHeight: 360,
    }}>
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--v4-border-tertiary)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>💬 입주민 메시지</p>
        <span style={{ fontSize: 10.5, color: "var(--v4-text-tertiary)" }}>
          {messages.length}건
        </span>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 10px", minHeight: 80 }}>
        {loading ? (
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: "16px 0", margin: 0 }}>불러오는 중...</p>
        ) : messages.length === 0 ? (
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: "16px 0", margin: 0 }}>
            아직 메시지가 없습니다
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map(m => {
              const mine = m.from === "CONSULTANT";
              return (
                <div key={m.id} style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}>
                  <div style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                    background: mine ? "#1d4ed8" : "var(--v4-bg-secondary)",
                    color: mine ? "white" : "var(--v4-text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {m.text}
                  </div>
                  <p style={{
                    margin: "2px 4px 0",
                    fontSize: 10,
                    color: "var(--v4-text-tertiary)",
                    textAlign: mine ? "right" : "left",
                  }}>
                    {m.by || (mine ? "상담사" : "입주민")} · {formatTime(m.at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: 8, borderTop: "1px solid var(--v4-border-tertiary)", display: "flex", gap: 6 }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          placeholder="입주민에게 메시지 (Enter 전송)"
          disabled={sending}
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "1px solid var(--v4-border-secondary)",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          style={{
            padding: "6px 12px",
            background: "#1d4ed8",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            opacity: (sending || !text.trim()) ? 0.5 : 1,
          }}
        >
          <Send size={11} /> 전송
        </button>
      </div>
    </div>
  );
}
