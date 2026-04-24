import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface DayEvent {
  date: Date;
  signing?: number;
  execution?: number;
}

export function MonthCalendarPopover({
  events,
  onClose,
}: {
  events: DayEvent[];
  onClose: () => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState<Date | null>(today);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const totalDays = Math.ceil(
      (monthEnd.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000) + 1
    );
    const cells = Math.ceil(totalDays / 7) * 7;
    return Array.from({ length: cells }).map((_, i) => addDays(gridStart, i));
  }, [cursor]);

  const findEvent = (d: Date) => events.find((e) => isSameDay(e.date, d));

  return (
    <div
      ref={ref}
      role="dialog"
      style={{
        position: "absolute",
        top: 44,
        left: 12,
        zIndex: 50,
        width: 300,
        background: "var(--v4-bg-primary)",
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: "var(--v4-radius-md)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          style={iconBtnStyle}
          title="이전 달"
        >
          <ChevronLeft size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => setCursor(today)}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          {format(cursor, "yyyy년 M월", { locale: ko })}
        </button>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            style={iconBtnStyle}
            title="다음 달"
          >
            <ChevronRight size={14} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={onClose} style={iconBtnStyle} title="닫기">
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
          <div
            key={d}
            style={{
              fontSize: 10,
              color: "var(--v4-text-tertiary)",
              textAlign: "center",
              fontWeight: 500,
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const e = findEvent(d);
          const isToday = isSameDay(d, today);
          const inMonth = isSameMonth(d, cursor);
          const isSelected = selected ? isSameDay(d, selected) : false;
          const bg = isSelected
            ? "var(--v4-bg-info)"
            : isToday
              ? "var(--v4-bg-secondary)"
              : "transparent";
          const border = isSelected
            ? "1px solid var(--v4-info)"
            : isToday
              ? "1px dashed var(--v4-border-tertiary)"
              : "1px solid transparent";
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => setSelected(d)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "4px 0",
                borderRadius: 4,
                background: bg,
                border,
                opacity: inMonth ? 1 : 0.35,
                minHeight: 38,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span
                className="v4-tabular"
                style={{
                  fontSize: 12,
                  fontWeight: isSelected || isToday ? 700 : 400,
                  color: isSelected
                    ? "var(--v4-info)"
                    : isToday
                      ? "var(--v4-text-primary)"
                      : "var(--v4-text-primary)",
                }}
              >
                {format(d, "d")}
              </span>
              <div style={{ display: "flex", gap: 2, height: 5 }}>
                {e?.signing ? <Dot color="var(--v4-info)" /> : null}
                {e?.execution ? <Dot color="var(--v4-success)" /> : null}
              </div>
            </button>
          );
        })}
      </div>

      {selected ? <DayDetail date={selected} event={findEvent(selected)} /> : null}

      <div
        style={{
          display: "flex",
          gap: 10,
          fontSize: 10.5,
          color: "var(--v4-text-tertiary)",
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px dashed var(--v4-border-tertiary)",
        }}
      >
        <Legend color="var(--v4-info)" label="자서" />
        <Legend color="var(--v4-success)" label="실행" />
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />;
}

function DayDetail({ date, event }: { date: Date; event?: DayEvent }) {
  const total = (event?.signing ?? 0) + (event?.execution ?? 0);
  const items: { label: string; count: number; color: string }[] = [];
  if (event?.signing) items.push({ label: "자서", count: event.signing, color: "var(--v4-info)" });
  if (event?.execution)
    items.push({ label: "실행", count: event.execution, color: "var(--v4-success)" });

  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: "1px dashed var(--v4-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
          }}
        >
          {format(date, "M월 d일 (EEE)", { locale: ko })}
        </span>
        <span
          className="v4-tabular"
          style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}
        >
          총 {total}건
        </span>
      </div>
      {total === 0 ? (
        <div style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
          예정된 일정이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((it) => (
            <div
              key={it.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderRadius: 4,
                background: "var(--v4-bg-secondary)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  color: "var(--v4-text-primary)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: it.color,
                  }}
                />
                {it.label}
              </span>
              <span
                className="v4-tabular"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: it.color,
                }}
              >
                {it.count}건
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} /> {label}
    </span>
  );
}

const iconBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  border: "1px solid var(--v4-border-tertiary)",
  background: "var(--v4-bg-primary)",
  borderRadius: 4,
  cursor: "pointer",
  color: "var(--v4-text-secondary)",
  fontFamily: "inherit",
} as const;
