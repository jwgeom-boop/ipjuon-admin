import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const DEFAULT_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const DEFAULT_LOCATION = "해당 은행 지점";

interface Props {
  consultationId: string;
  /** 위 캘린더에서 lift up 된 제외 날짜 (이 컴포넌트는 표시·저장만 담당) */
  excludedDates: Set<string>;
  setExcludedDates: (s: Set<string>) => void;
  /** 부모가 캘린더 표시 모드 토글 가능하도록 */
  excludeMode: boolean;
}

/**
 * 자서 일정 캘린더 v2 — 설정 패널 (캘린더는 위 자서일 선택 캘린더와 공유).
 * 시간대/장소 설정 + 입주민 선택 표시 + 공개/확정 버튼만 담당.
 */
export default function SigningSlotInline({ consultationId, excludedDates, setExcludedDates, excludeMode }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windowStart, setWindowStart] = useState<string>("");
  const [windowEnd, setWindowEnd] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<Set<string>>(new Set(DEFAULT_TIMES));
  const [locations, setLocations] = useState<string[]>([DEFAULT_LOCATION]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [signingDateConfirmed, setSigningDateConfirmed] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    return api.getConsultationById(consultationId).then((c: any) => {
      const today = new Date(); today.setHours(0,0,0,0);
      const winStart = c.signing_window_start ?? new Date(today.getTime() + 3*86400000).toISOString().slice(0,10);
      const winEnd = c.signing_window_end ?? new Date(today.getTime() + 30*86400000).toISOString().slice(0,10);
      setWindowStart(winStart);
      setWindowEnd(winEnd);
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
    }).catch(() => toast.error("자서 캘린더 정보 조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [consultationId]);

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
          {excludeMode ? "🚫 캘린더 클릭 = 제외 토글" : "캘린더 헤더의 [B2C 제외 편집] 클릭 후 날짜 선택"}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>불러오는 중...</p>
      ) : (
        <>
          {/* 확정 */}
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

          {/* 표시기간 + 제외 카운트 */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 10px",
            background: "var(--v4-bg-secondary)",
            borderRadius: 6,
            fontSize: 11.5,
            marginBottom: 12,
          }}>
            <span style={{ color: "var(--v4-text-secondary)" }}>
              표시 기간: <b>{windowStart}</b> ~ <b>{windowEnd}</b>
            </span>
            <span style={{ color: "#dc2626", fontWeight: 600 }}>
              🚫 제외 {excludedDates.size}일
            </span>
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
            ※ 안 되는 날은 위 자서일 선택 캘린더에서 [B2C 제외 편집] 모드로 클릭하여 표시
          </p>
        </>
      )}
    </section>
  );
}
