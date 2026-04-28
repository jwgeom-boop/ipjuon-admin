import { useEffect, useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Slot { date: string; time: string; location: string; }

interface Props {
  consultationId: string;
}

const formatDateLabel = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

/**
 * ReservationWizard 인라인 — 입주민에게 제시할 자서 슬롯을 N개까지 관리.
 * 다이얼로그 버전(SigningSlotDialog) 과 동일 로직, 섹션 형태로 임베드.
 */
export default function SigningSlotInline({ consultationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [signingDate, setSigningDate] = useState<string | null>(null);
  const [signingTime, setSigningTime] = useState<string | null>(null);
  const [signingLocation, setSigningLocation] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    return api.getConsultationById(consultationId)
      .then((c: any) => {
        if (c.signing_offered_slots) {
          try { setSlots(JSON.parse(c.signing_offered_slots)); } catch { setSlots([]); }
        } else {
          setSlots([]);
        }
        setSelectedIdx(c.signing_selected_slot_index ?? null);
        setConfirmedAt(c.signing_confirmed_at ?? null);
        setSigningDate(c.signing_date ?? null);
        setSigningTime(c.signing_time ?? null);
        setSigningLocation(c.signing_location ?? null);
      })
      .catch(() => toast.error("슬롯 정보 조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [consultationId]);

  const addSlot = () => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    setSlots([...slots, { date: today.toISOString().slice(0, 10), time: "10:00", location: "본점 1층" }]);
  };
  const removeSlot = (idx: number) => setSlots(slots.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, field: keyof Slot, value: string) => {
    setSlots(slots.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveSlots = async () => {
    if (slots.length === 0) { toast.error("슬롯을 1개 이상 추가하세요"); return; }
    setSaving(true);
    try {
      await api.setSigningSlots(consultationId, slots);
      toast.success("슬롯 제시 완료 — 입주민 앱에 푸시 발송됨");
      setSelectedIdx(null);
      setConfirmedAt(null);
    } catch (e: any) {
      toast.error(e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (selectedIdx === null) return;
    setSaving(true);
    try {
      const updated = await api.confirmSigningSlot(consultationId);
      toast.success("자서 일정 확정 — 입주민 앱에 푸시 발송됨");
      setConfirmedAt(updated.signing_confirmed_at);
      setSigningDate(updated.signing_date);
      setSigningTime(updated.signing_time);
      setSigningLocation(updated.signing_location);
    } catch (e: any) {
      toast.error(e?.message || "확정 실패");
    } finally {
      setSaving(false);
    }
  };

  const SECTION_TITLE_STYLE = {
    fontSize: 13,
    fontWeight: 700,
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
        <div style={SECTION_TITLE_STYLE}>📅 입주민 앱 자서 슬롯 (B2C)</div>
        <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
          입주민 앱으로 N개 일정 제시 → 선택 → 확정
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>불러오는 중...</p>
      ) : (
        <>
          {/* 확정된 일정 */}
          {confirmedAt && (
            <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ background: "#16a34a", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check size={11} /> 확정됨
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0 }}>
                {signingDate} {signingTime} · {signingLocation}
              </p>
            </div>
          )}

          {/* 입주민 선택분 + 확정 버튼 */}
          {!confirmedAt && selectedIdx !== null && slots[selectedIdx] && (
            <div style={{ background: "#dbeafe", border: "2px solid #3b82f6", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, margin: "0 0 4px 0" }}>👤 입주민이 선택한 슬롯</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", margin: "0 0 10px 0" }}>
                {formatDateLabel(slots[selectedIdx].date)} {slots[selectedIdx].time} · {slots[selectedIdx].location}
              </p>
              <button
                onClick={confirm}
                disabled={saving}
                style={{
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {saving ? "처리 중..." : "✅ 이 일정으로 확정 (입주민 푸시)"}
              </button>
            </div>
          )}

          {/* 슬롯 편집 */}
          {slots.length === 0 && !confirmedAt ? (
            <p style={{ fontSize: 12, color: "#6b7280", padding: 12, textAlign: "center", background: "#f9fafb", borderRadius: 8, margin: 0 }}>
              아직 제시된 슬롯이 없습니다.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {slots.map((s, i) => {
                const isSelected = i === selectedIdx;
                return (
                  <div key={i} style={{
                    border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    background: isSelected ? "#eff6ff" : "white",
                  }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <input
                        type="date"
                        value={s.date}
                        onChange={e => updateSlot(i, "date", e.target.value)}
                        disabled={!!confirmedAt}
                        style={{ flex: 1, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12 }}
                      />
                      <input
                        type="time"
                        value={s.time}
                        onChange={e => updateSlot(i, "time", e.target.value)}
                        disabled={!!confirmedAt}
                        step="3600"
                        style={{ width: 92, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12 }}
                      />
                      {!confirmedAt && (
                        <button onClick={() => removeSlot(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "5px 8px", cursor: "pointer" }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={s.location}
                      onChange={e => updateSlot(i, "location", e.target.value)}
                      disabled={!!confirmedAt}
                      placeholder="장소 (예: 부전동지점 2층)"
                      style={{ width: "100%", padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, boxSizing: "border-box" }}
                    />
                    {isSelected && (
                      <p style={{ fontSize: 10.5, color: "#1d4ed8", margin: "4px 0 0 0", fontWeight: 600 }}>
                        ⭐ 입주민 선택
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!confirmedAt && (
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button
                onClick={addSlot}
                style={{
                  flex: 1,
                  background: "white",
                  color: "var(--v4-text-primary)",
                  border: "1px solid var(--v4-border-secondary)",
                  borderRadius: 6,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Plus size={12} /> 슬롯 추가
              </button>
              <button
                onClick={saveSlots}
                disabled={saving || slots.length === 0}
                style={{
                  flex: 2,
                  background: "#1e3a8a",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: (saving || slots.length === 0) ? 0.5 : 1,
                }}
              >
                {saving ? "저장 중..." : "📤 입주민에게 제시"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
