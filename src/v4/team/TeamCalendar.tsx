import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";
import {
  getAllReservationHandoffs,
  type ReservationHandoff,
} from "../wizard/reservationHandoff";

const WEEKDAY_KR = ["월", "화", "수", "목", "금", "토", "일"];
const YEAR = new Date().getFullYear();

type DayKey = string;

interface ReservationEvent {
  caseId: string;
  customerName: string;
  signingTime: string;
  signingLocation: string;
  assignee?: string;
}

type DayBucket = {
  signing: TaskItem[];
  execution: TaskItem[];
  reservation: ReservationEvent[];
};

type Props = {
  tasks: TaskItem[];
  onSelectTask?: (task: TaskItem) => void;
  // fill: 부모 flex/grid 셀 높이를 채움. 캘린더 본문(주간 그리드)이 넘치면 내부 스크롤.
  fill?: boolean;
};

function parseSigning(label?: string): { month: number; day: number } | null {
  if (!label) return null;
  const m = label.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  return { month: parseInt(m[1], 10), day: parseInt(m[2], 10) };
}
function parseExecution(label?: string): { month: number; day: number } | null {
  if (!label) return null;
  const iso = label.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return { month: parseInt(iso[1], 10), day: parseInt(iso[2], 10) };
  const m = label.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (!m) return null;
  return { month: parseInt(m[1], 10), day: parseInt(m[2], 10) };
}
function dayKey(year: number, month: number, day: number): DayKey {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildEventsByDay(
  tasks: TaskItem[],
  reservations: ReservationHandoff[],
): Record<DayKey, DayBucket> {
  const map: Record<DayKey, DayBucket> = {};
  const today = new Date();
  const todayK = dayKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const ensure = (k: DayKey): DayBucket =>
    (map[k] ||= { signing: [], execution: [], reservation: [] });
  for (const t of tasks) {
    const s = parseSigning(t.signingDateLabel);
    const e = parseExecution(t.executionDate);
    if (s) ensure(dayKey(YEAR, s.month, s.day)).signing.push(t);
    if (e) ensure(dayKey(YEAR, e.month, e.day)).execution.push(t);
    // Fallback: tag-only "today" markers without explicit dates
    if (!s && t.tag === "자서") ensure(todayK).signing.push(t);
    if (!e && t.tag === "실행") ensure(todayK).execution.push(t);
  }
  // 예약 — 위저드에서 확정한 자서예약 snapshot
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  for (const h of reservations) {
    if (!h.signingDate) continue;
    const m = h.signingDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) continue;
    const k = `${m[1]}-${m[2]}-${m[3]}`;
    const matched = taskById.get(h.caseId);
    ensure(k).reservation.push({
      caseId: h.caseId,
      customerName: matched?.customerName ?? h.caseId,
      signingTime: h.signingTime,
      signingLocation: h.signingLocation,
      assignee: matched?.assignee,
    });
  }
  return map;
}

function pickInitialMonth(eventsByDay: Record<DayKey, DayBucket>): { year: number; month: number } {
  const today = new Date();
  const todayYM = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const todayKey = dayKey(todayYM.year, todayYM.month, 1).slice(0, 7);
  const hasThisMonth = Object.keys(eventsByDay).some((k) => k.startsWith(todayKey));
  if (hasThisMonth) return todayYM;
  const sortedKeys = Object.keys(eventsByDay).sort();
  const first = sortedKeys.find((k) => k >= dayKey(todayYM.year, todayYM.month, 1));
  if (first) {
    const [y, m] = first.split("-");
    return { year: parseInt(y, 10), month: parseInt(m, 10) };
  }
  return todayYM;
}

export function TeamCalendar({ tasks, onSelectTask, fill }: Props) {
  const reservations = useMemo(() => getAllReservationHandoffs(), []);
  const eventsByDay = useMemo(
    () => buildEventsByDay(tasks, reservations),
    [tasks, reservations],
  );
  const initial = useMemo(() => pickInitialMonth(eventsByDay), [eventsByDay]);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selectedKey, setSelectedKey] = useState<DayKey>(() => {
    const today = new Date();
    const todayK = dayKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
    if (eventsByDay[todayK]) return todayK;
    const monthPrefix = dayKey(initial.year, initial.month, 1).slice(0, 7);
    const firstInMonth = Object.keys(eventsByDay)
      .filter((k) => k.startsWith(monthPrefix))
      .sort()[0];
    return firstInMonth ?? todayK;
  });

  const firstDayIndex = (() => {
    const dow = new Date(viewYear, viewMonth - 1, 1).getDay();
    return (dow + 6) % 7;
  })();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const cells: { key: DayKey; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDayIndex) {
      const d = prevMonthDays - firstDayIndex + 1 + i;
      const pm = viewMonth === 1 ? 12 : viewMonth - 1;
      const py = viewMonth === 1 ? viewYear - 1 : viewYear;
      cells.push({ key: dayKey(py, pm, d), day: d, inMonth: false });
    } else if (i < firstDayIndex + daysInMonth) {
      const d = i - firstDayIndex + 1;
      cells.push({ key: dayKey(viewYear, viewMonth, d), day: d, inMonth: true });
    } else {
      const d = i - firstDayIndex - daysInMonth + 1;
      const nm = viewMonth === 12 ? 1 : viewMonth + 1;
      const ny = viewMonth === 12 ? viewYear + 1 : viewYear;
      cells.push({ key: dayKey(ny, nm, d), day: d, inMonth: false });
    }
  }

  const today = new Date();
  const todayKey = dayKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const weekRange = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dow = base.getDay();
    const offsetToMon = (dow + 6) % 7;
    const mon = new Date(base);
    mon.setDate(base.getDate() - offsetToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      startKey: dayKey(mon.getFullYear(), mon.getMonth() + 1, mon.getDate()),
      endKey: dayKey(sun.getFullYear(), sun.getMonth() + 1, sun.getDate()),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const weekSummary = useMemo(() => {
    let signing = 0;
    let execution = 0;
    let reservation = 0;
    Object.entries(eventsByDay).forEach(([k, bucket]) => {
      if (k >= weekRange.startKey && k <= weekRange.endKey) {
        signing += bucket.signing.length;
        execution += bucket.execution.length;
        reservation += bucket.reservation.length;
      }
    });
    const delayed = tasks.filter((t) => t.tag === "지연").length;
    return { signing, execution, reservation, delayed };
  }, [eventsByDay, weekRange, tasks]);

  const selectedDDay = useMemo(() => {
    const [sy, sm, sd] = selectedKey.split("-").map(Number);
    const sel = new Date(sy, sm - 1, sd).getTime();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const diff = Math.round((sel - base) / 86400000);
    if (diff === 0) return "오늘";
    if (diff > 0) return `D-${diff}`;
    return `D+${-diff}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, todayKey]);

  const gotoPrev = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else setViewMonth(viewMonth - 1);
  };
  const gotoNext = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else setViewMonth(viewMonth + 1);
  };

  const selectedBucket = eventsByDay[selectedKey];
  const selectedDate = (() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return { y, m, d, dowLabel: WEEKDAY_KR[(dow + 6) % 7] };
  })();
  const selTotal =
    (selectedBucket?.signing.length ?? 0) +
    (selectedBucket?.execution.length ?? 0) +
    (selectedBucket?.reservation.length ?? 0);

  return (
    <section
      style={{
        background: "var(--v4-bg-secondary)",
        border: "1px solid var(--v4-border-light)",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              height: "100%",
              overflow: "hidden",
            }
          : {}),
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <button type="button" onClick={gotoPrev} style={navBtnStyle} aria-label="이전 달">
          <ChevronLeft size={13} strokeWidth={2} />
        </button>
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            letterSpacing: "-0.2px",
          }}
        >
          {viewYear}년 {viewMonth}월
        </h3>
        <button type="button" onClick={gotoNext} style={navBtnStyle} aria-label="다음 달">
          <ChevronRight size={13} strokeWidth={2} />
        </button>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10.5,
          color: "var(--v4-text-tertiary)",
          flexWrap: "wrap",
          paddingBottom: 2,
        }}
      >
        <span style={{ fontWeight: 500, color: "var(--v4-text-secondary)" }}>이번주</span>
        <SummaryChip color="var(--v4-warning)" label="예약" value={weekSummary.reservation} />
        <SummaryChip color="var(--v4-info)" label="자서" value={weekSummary.signing} />
        <SummaryChip color="var(--v4-success)" label="실행" value={weekSummary.execution} />
        <SummaryChip color="var(--v4-danger)" label="지연" value={weekSummary.delayed} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          fontSize: 10,
          color: "var(--v4-text-tertiary)",
          textAlign: "center",
        }}
      >
        {WEEKDAY_KR.map((d) => (
          <span key={d} style={{ padding: "4px 0", fontWeight: 500 }}>
            {d}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        {cells.map((cell) => {
          const bucket = eventsByDay[cell.key];
          const hasSigning = !!bucket?.signing.length;
          const hasExecution = !!bucket?.execution.length;
          const hasReservation = !!bucket?.reservation.length;
          const signingAllUnassigned =
            hasSigning && bucket!.signing.every((t) => !t.assignee?.trim());
          const executionAllUnassigned =
            hasExecution && bucket!.execution.every((t) => !t.assignee?.trim());
          const reservationAllUnassigned =
            hasReservation && bucket!.reservation.every((r) => !r.assignee?.trim());
          const isSelected = cell.key === selectedKey;
          const isToday = cell.key === todayKey;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedKey(cell.key)}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                fontSize: 11,
                fontFamily: "inherit",
                color: !cell.inMonth
                  ? "var(--v4-text-tertiary)"
                  : isSelected
                    ? "var(--v4-text-info)"
                    : "var(--v4-text-primary)",
                fontWeight: isSelected || isToday ? 600 : 400,
                background: isSelected ? "var(--v4-bg-info)" : "transparent",
                border: isSelected
                  ? "1px solid var(--v4-border-info)"
                  : "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
                padding: 0,
                opacity: cell.inMonth ? 1 : 0.45,
              }}
            >
              <span>{cell.day}</span>
              {(hasSigning || hasExecution || hasReservation) && cell.inMonth ? (
                <span style={{ display: "inline-flex", gap: 2, height: 5 }}>
                  {hasReservation ? (
                    <Dot color="var(--v4-warning)" outline={reservationAllUnassigned} />
                  ) : null}
                  {hasSigning ? (
                    <Dot color="var(--v4-info)" outline={signingAllUnassigned} />
                  ) : null}
                  {hasExecution ? (
                    <Dot color="var(--v4-success)" outline={executionAllUnassigned} />
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--v4-border-light)",
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          ...(fill ? { flex: 1, minHeight: 0, overflowY: "auto" } : {}),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--v4-text-primary)",
            }}
          >
            {selectedDate.m}월 {selectedDate.d}일 ({selectedDate.dowLabel})
            <DDayBadge label={selectedDDay} />
          </span>
          <span
            className="v4-tabular"
            style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}
          >
            총 {selTotal}건
          </span>
        </div>

        {selTotal === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "var(--v4-text-tertiary)",
              padding: "6px 2px",
            }}
          >
            일정 없음
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              columnGap: 8,
              rowGap: 4,
            }}
          >
            {selectedBucket?.reservation.length ? (
              <ReservationGroupRow
                color="var(--v4-warning)"
                label="예약"
                items={selectedBucket.reservation}
                onSelect={(caseId) => {
                  const t = tasks.find((x) => x.id === caseId);
                  if (t && onSelectTask) onSelectTask(t);
                }}
              />
            ) : null}
            {selectedBucket?.signing.length ? (
              <GroupRow
                color="var(--v4-info)"
                label="자서"
                tasks={selectedBucket.signing}
                onSelectTask={onSelectTask}
              />
            ) : null}
            {selectedBucket?.execution.length ? (
              <GroupRow
                color="var(--v4-success)"
                label="실행"
                tasks={selectedBucket.execution}
                onSelectTask={onSelectTask}
              />
            ) : null}
          </ul>
        )}
      </div>

    </section>
  );
}

function GroupRow({
  color,
  label,
  tasks,
  onSelectTask,
}: {
  color: string;
  label: string;
  tasks: TaskItem[];
  onSelectTask?: (t: TaskItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "4px 2px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11.5,
          color: "var(--v4-text-secondary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Dot color={color} />
          {label}
        </span>
        <span className="v4-tabular" style={{ color, fontWeight: 600 }}>
          {tasks.length}건
        </span>
      </button>
      {expanded ? (
        <ul
          style={{
            listStyle: "none",
            margin: "2px 0 6px 10px",
            padding: 0,
            display: "grid",
            gap: 2,
          }}
        >
          {tasks.map((t) => {
            const unassigned = !t.assignee?.trim();
            return (
              <li key={`${label}-${t.id}`}>
                <button
                  type="button"
                  onClick={() => onSelectTask?.(t)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "3px 6px",
                    fontSize: 11,
                    background: "transparent",
                    border: "none",
                    cursor: onSelectTask ? "pointer" : "default",
                    fontFamily: "inherit",
                    color: "var(--v4-text-primary)",
                    borderRadius: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--v4-bg-tertiary)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontWeight: 500 }}>{t.customerName}</span>
                  {unassigned ? (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 500,
                        padding: "1px 5px",
                        border: "1px dashed var(--v4-info)",
                        color: "var(--v4-text-info)",
                        borderRadius: 3,
                      }}
                    >
                      미배정
                    </span>
                  ) : (
                    <span style={{ color: "var(--v4-text-tertiary)" }}>{t.assignee}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function ReservationGroupRow({
  color,
  label,
  items,
  onSelect,
}: {
  color: string;
  label: string;
  items: ReservationEvent[];
  onSelect?: (caseId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "4px 2px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11.5,
          color: "var(--v4-text-secondary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Dot color={color} />
          {label}
        </span>
        <span className="v4-tabular" style={{ color, fontWeight: 600 }}>
          {items.length}건
        </span>
      </button>
      {expanded ? (
        <ul
          style={{
            listStyle: "none",
            margin: "2px 0 6px 10px",
            padding: 0,
            display: "grid",
            gap: 2,
          }}
        >
          {items.map((r) => (
            <li key={`reservation-${r.caseId}`}>
              <button
                type="button"
                onClick={() => onSelect?.(r.caseId)}
                title={r.signingLocation}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "3px 6px",
                  fontSize: 11,
                  background: "transparent",
                  border: "none",
                  cursor: onSelect ? "pointer" : "default",
                  fontFamily: "inherit",
                  color: "var(--v4-text-primary)",
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--v4-bg-tertiary)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span className="v4-tabular" style={{ color: "var(--v4-text-tertiary)" }}>
                  {r.signingTime || "—"}
                </span>
                <span style={{ fontWeight: 500 }}>{r.customerName}</span>
                {r.assignee?.trim() ? (
                  <span style={{ color: "var(--v4-text-tertiary)" }}>{r.assignee}</span>
                ) : (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 500,
                      padding: "1px 5px",
                      border: "1px dashed var(--v4-warning)",
                      color: "var(--v4-warning)",
                      borderRadius: 3,
                    }}
                  >
                    예약
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Dot({ color, outline }: { color: string; outline?: boolean }) {
  return (
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: 999,
        background: outline ? "transparent" : color,
        border: outline ? `1px solid ${color}` : "none",
        display: "inline-block",
      }}
    />
  );
}

function DDayBadge({ label }: { label: string }) {
  const tone =
    label === "오늘"
      ? { bg: "var(--v4-bg-info)", color: "var(--v4-text-info)" }
      : label.startsWith("D-")
        ? { bg: "var(--v4-bg-warning)", color: "var(--v4-text-warning)" }
        : { bg: "var(--v4-bg-tertiary)", color: "var(--v4-text-tertiary)" };
  return (
    <span
      className="v4-tabular"
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 3,
        background: tone.bg,
        color: tone.color,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </span>
  );
}

function SummaryChip({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  const muted = value === 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        opacity: muted ? 0.5 : 1,
      }}
    >
      <Dot color={color} />
      <span>{label}</span>
      <span className="v4-tabular" style={{ fontWeight: 600, color }}>
        {value}
      </span>
    </span>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 4,
  border: "1px solid var(--v4-border-light)",
  background: "var(--v4-bg-primary)",
  color: "var(--v4-text-secondary)",
  cursor: "pointer",
  padding: 0,
};
