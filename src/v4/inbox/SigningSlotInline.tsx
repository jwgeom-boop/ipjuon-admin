import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const DEFAULT_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const DEFAULT_LOCATION = "해당 은행 지점";
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const ymd = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayPlus = (n: number) => {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n);
  return d;
};

interface Props {
  consultationId: string;
}

/**
 * 자서 일정 캘린더 (v2 — opt-out 방식).
 * - 캘린더에서 클릭 = 가능/제외 토글
 * - 기본: window 안의 모든 날짜가 가능 (주말 포함, 상담사 의지대로)
 * - 시간대/장소는 별도로 설정
 * - 같은 은행의 다른 상담건 자서 예약은 작은 배지로 표시
 * - 입주민이 선택한 일정은 강조 + 확정 버튼
 */
export default function SigningSlotInline({ consultationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windowStart, setWindowStart] = useState<string>(ymd(todayPlus(3)));
  const [windowEnd, setWindowEnd] = useState<string>(ymd(todayPlus(30)));
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());
  const [availableTimes, setAvailableTimes] = useState<Set<string>>(new Set(DEFAULT_TIMES));
  const [locations, setLocations] = useState<string[]>([DEFAULT_LOCATION]);
  const [bookings, setBookings] = useState<Record<string, Array<{ time: string; customer: string }>>>({});
  // 입주민 선택분
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [signingDateConfirmed, setSigningDateConfirmed] = useState<string | null>(null);
  // 캘린더 표시 월 (0-based month, year)
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const reload = () => {
    setLoading(true);
    return Promise.all([
      api.getConsultationById(consultationId),
      api.getOtherSigningBookings(consultationId).catch(() => ({})),
    ]).then(([c, bookingsData]: any) => {
      if (c.signing_window_start) setWindowStart(c.signing_window_start);
      if (c.signing_window_end) setWindowEnd(c.signing_window_end);
      try {
        if (c.signing_excluded_dates) setExcludedDates(new Set(JSON.parse(c.signing_excluded_dates)));
      } catch {}
      try {
        if (c.signing_available_times) setAvailableTimes(new Set(JSON.parse(c.signing_available_times)));
      } catch {}
      try {
        if (c.signing_available_locations) setLocations(JSON.parse(c.signing_available_locations));
      } catch {}
      setSelectedDate(c.signing_selected_date ?? null);
      setSelectedTime(c.signing_selected_time ?? null);
      setSelectedLocation(c.signing_selected_location_str ?? null);
      setConfirmedAt(c.signing_confirmed_at ?? null);
      setSigningDateConfirmed(c.signing_date ?? null);
      setBookings(bookingsData || {});
    }).catch(() => toast.error("자서 캘린더 정보 조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [consultationId]);

  // 캘린더 그리드 계산
  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const startPad = first.getDay(); // 일요일=0
    const totalDays = last.getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const isInWindow = (iso: string) => iso >= windowStart && iso <= windowEnd;

  const toggleExcluded = (iso: string) => {
    if (confirmedAt) return;
    const next = new Set(excludedDates);
    if (next.has(iso)) next.delete(iso); else next.add(iso);
    setExcludedDates(next);
  };
  const toggleTime = (t: string) => {
    if (confirmedAt) return;
    const next = new Set(availableTimes);
    if (next.has(t)) next.delete(t); else next.add(t);
    setAvailableTimes(next);
  };
  const updateLocation = (i: number, v: string) => {
    setLocations(locations.map((l, idx) => idx === i ? v : l));
  };
  const addLocation = () => setLocations([...locations, ""]);
  const removeLocation = (i: number) => setLocations(locations.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await api.setSigningCalendar(consultationId, {
        window_start: windowStart,
        window_end: windowEnd,
        excluded_dates: Array.from(excludedDates),
        available_times: Array.from(availableTimes).sort(),
        available_locations: locations.filter(l => l.trim()),
      });
      toast.success("자서 캘린더 공개 — 입주민 앱에 푸시 발송됨");
      // 새 설정 시 입주민 선택 초기화
      setSelectedDate(null); setSelectedTime(null); setSelectedLocation(null);
      setConfirmedAt(null);
    } catch (e: any) {
      toast.error(e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const updated: any = await api.confirmSigningCalendar(consultationId);
      toast.success("자서 일정 확정 — 입주민 앱에 푸시 발송됨");
      setConfirmedAt(updated.signing_confirmed_at);
      setSigningDateConfirmed(updated.signing_date);
    } catch (e: any) {
      toast.error(e?.message || "확정 실패");
    } finally {
      setSaving(false);
    }
  };

  const SECTION_TITLE_STYLE = {
    fontSize: 13,
    fontWeight: 700 as const,
    color: "var(--v4-text-primary)",
    marginBottom: 10,
  };

  return (
    <section style={{
      background: "var(--v4-bg-primary)",
      border: "1px solid var(--v4-border-tertiary)",
      borderRadius: "var(--v4-radius-md)",
      padding: 14,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={SECTION_TITLE_STYLE}>📅 입주민 앱 자서 캘린더 (B2C)</div>
        <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
          기본 가능 · 안 되는 날만 클릭 제외
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>불러오는 중...</p>
      ) : (
        <>
          {/* 확정된 경우 */}
          {confirmedAt && (
            <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <span style={{ background: "#16a34a", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Check size={11} /> 확정됨
              </span>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: "6px 0 0 0" }}>
                {signingDateConfirmed} {selectedTime} · {selectedLocation}
              </p>
            </div>
          )}

          {/* 입주민 선택 + 확정 버튼 */}
          {!confirmedAt && selectedDate && (
            <div style={{ background: "#dbeafe", border: "2px solid #3b82f6", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, margin: "0 0 4px 0" }}>👤 입주민 선택</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", margin: "0 0 10px 0" }}>
                {selectedDate} {selectedTime} · {selectedLocation}
              </p>
              <button onClick={confirm} disabled={saving} style={{
                background: "#16a34a", color: "white", border: "none", borderRadius: 6,
                padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", width: "100%",
              }}>
                {saving ? "처리 중..." : "✅ 확정 (입주민 푸시)"}
              </button>
            </div>
          )}

          {/* 캘린더 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button onClick={() => { const d = new Date(viewYear, viewMonth - 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: 16 }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{viewYear}.{String(viewMonth + 1).padStart(2, "0")}</span>
            <button onClick={() => { const d = new Date(viewYear, viewMonth + 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: 16 }}>›</button>
          </div>

          {/* 캘린더 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 12 }}>
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={w} style={{
                fontSize: 10, fontWeight: 700, textAlign: "center", padding: "4px 0",
                color: i === 0 ? "#dc2626" : i === 6 ? "#1d4ed8" : "var(--v4-text-tertiary)",
              }}>{w}</div>
            ))}
            {calendarDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = ymd(d);
              const inWin = isInWindow(iso);
              const excluded = excludedDates.has(iso);
              const dateBookings = bookings[iso] || [];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const dim = !inWin || excluded;
              return (
                <button
                  key={i}
                  onClick={() => inWin && toggleExcluded(iso)}
                  disabled={!inWin || !!confirmedAt}
                  style={{
                    background: dim ? "#f3f4f6" : "white",
                    border: excluded ? "2px solid #dc2626" : "1px solid #e5e7eb",
                    borderRadius: 6,
                    padding: "4px 2px",
                    minHeight: 42,
                    cursor: inWin && !confirmedAt ? "pointer" : "default",
                    opacity: !inWin ? 0.4 : 1,
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 2,
                  }}
                  title={inWin ? (excluded ? "제외됨 — 클릭하여 가능으로 변경" : "가능 — 클릭하여 제외") : "표시 기간 외"}
                >
                  <span style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: excluded ? "#dc2626" : isWeekend ? (d.getDay() === 0 ? "#dc2626" : "#1d4ed8") : "var(--v4-text-primary)",
                    textDecoration: excluded ? "line-through" : "none",
                  }}>
                    {d.getDate()}
                  </span>
                  {dateBookings.length > 0 && (
                    <span style={{
                      fontSize: 9,
                      color: "#92400e",
                      background: "#fef3c7",
                      padding: "0 3px",
                      borderRadius: 3,
                      fontWeight: 700,
                    }}>{dateBookings.length}건</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 시간대 칩 */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--v4-text-secondary)", margin: "0 0 6px 0" }}>가능 시간대 (멀티)</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {DEFAULT_TIMES.map(t => {
                const on = availableTimes.has(t);
                return (
                  <button key={t} onClick={() => toggleTime(t)} disabled={!!confirmedAt}
                    style={{
                      padding: "5px 10px",
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: on ? "#1d4ed8" : "#d1d5db",
                      background: on ? "#dbeafe" : "white",
                      color: on ? "#1d4ed8" : "var(--v4-text-secondary)",
                      cursor: confirmedAt ? "default" : "pointer",
                    }}
                  >{t}</button>
                );
              })}
            </div>
          </div>

          {/* 가능 장소 */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--v4-text-secondary)", margin: "0 0 6px 0" }}>가능 장소</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {locations.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 4 }}>
                  <input type="text" value={l} onChange={e => updateLocation(i, e.target.value)} disabled={!!confirmedAt}
                    placeholder="예: 부전동지점 2층 상담실"
                    style={{ flex: 1, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12 }}
                  />
                  {!confirmedAt && locations.length > 1 && (
                    <button onClick={() => removeLocation(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "0 8px", cursor: "pointer", fontSize: 14 }}>×</button>
                  )}
                </div>
              ))}
              {!confirmedAt && (
                <button onClick={addLocation} style={{
                  background: "white", color: "var(--v4-text-secondary)",
                  border: "1px dashed var(--v4-border-secondary)", borderRadius: 5,
                  padding: "5px", fontSize: 11, cursor: "pointer",
                }}>+ 장소 추가</button>
              )}
            </div>
          </div>

          {/* 저장 버튼 */}
          {!confirmedAt && (
            <button onClick={save} disabled={saving || availableTimes.size === 0 || locations.filter(l => l.trim()).length === 0}
              style={{
                width: "100%", background: "#1e3a8a", color: "white", border: "none",
                borderRadius: 6, padding: "9px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                opacity: (saving || availableTimes.size === 0) ? 0.5 : 1,
              }}
            >
              {saving ? "저장 중..." : "📤 입주민에게 캘린더 공개"}
            </button>
          )}

          <p style={{ fontSize: 10.5, color: "var(--v4-text-tertiary)", margin: "8px 0 0 0", lineHeight: 1.5 }}>
            ※ 빨간 테두리 = 제외된 날짜 · 노란 배지 = 같은 은행 다른 상담건 자서 예약 수
          </p>
        </>
      )}
    </section>
  );
}
