import { useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { MonthCalendarPopover } from "./MonthCalendarPopover";

interface DayEvent {
  date: Date;
  signing?: number;
  execution?: number;
}

export function WeekMini({ events }: { events: DayEvent[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const findEvent = (d: Date) => events.find((e) => isSameDay(e.date, d));
  const meta = `${format(weekStart, "M.d", { locale: ko })}–${format(
    addDays(weekStart, 6),
    "M.d",
    { locale: ko }
  )}`;

  return (
    <div style={{ position: "relative" }}>
    <SidePanel
      title="이번 주"
      tone="info"
      icon={<CalendarDays size={13} strokeWidth={2} />}
      meta={meta}
      tinted
      onIconClick={() => setCalendarOpen((v) => !v)}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((d) => {
          const e = findEvent(d);
          const isToday = isSameDay(d, today);
          const total = (e?.signing ?? 0) + (e?.execution ?? 0);
          return (
            <div
              key={d.toISOString()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 0 8px",
                borderRadius: "var(--v4-radius-sm)",
                background: isToday ? "var(--v4-bg-info)" : "transparent",
                border: isToday ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid transparent",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: isToday ? "var(--v4-info)" : "var(--v4-text-tertiary)",
                  fontWeight: isToday ? 600 : 400,
                  letterSpacing: 0.3,
                }}
              >
                {format(d, "EEE", { locale: ko })}
              </div>
              <div
                className="v4-tabular"
                style={{
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "var(--v4-info)" : "var(--v4-text-secondary)",
                }}
              >
                {format(d, "d")}
              </div>
              <div style={{ display: "flex", gap: 2, height: 6, alignItems: "center" }}>
                {e?.signing ? (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--v4-info)" }} />
                ) : null}
                {e?.execution ? (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--v4-success)" }} />
                ) : null}
                {total === 0 ? (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--v4-border-tertiary)" }} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 11,
          color: "var(--v4-text-tertiary)",
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--v4-border-tertiary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--v4-info)" }} /> 자서
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--v4-success)" }} /> 실행
        </span>
      </div>
    </SidePanel>
    {calendarOpen ? (
      <MonthCalendarPopover events={events} onClose={() => setCalendarOpen(false)} />
    ) : null}
    </div>
  );
}
