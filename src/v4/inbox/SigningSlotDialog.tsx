import { useEffect, useState } from "react";
import { X, Plus, Trash2, Check, Clock, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Slot { date: string; time: string; location: string; }

interface Props {
  consultationId: string;
  open: boolean;
  onClose: () => void;
}

const formatDateLabel = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

/**
 * 자서 일정 관리 다이얼로그.
 *  - 상단: 입주민이 선택한 슬롯 + 확정 버튼 (있으면)
 *  - 하단: 제시 슬롯 편집 (추가/삭제) + 저장 → 입주민 푸시
 */
export default function SigningSlotDialog({ consultationId, open, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [signingDate, setSigningDate] = useState<string | null>(null);
  const [signingTime, setSigningTime] = useState<string | null>(null);
  const [signingLocation, setSigningLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getConsultationById(consultationId)
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
      .catch(() => toast.error("일정 정보 조회 실패"))
      .finally(() => setLoading(false));
  }, [consultationId, open]);

  if (!open) return null;

  const addSlot = () => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const isoDate = today.toISOString().slice(0, 10);
    setSlots([...slots, { date: isoDate, time: "10:00", location: "본점 1층" }]);
  };

  const removeSlot = (idx: number) => {
    setSlots(slots.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: keyof Slot, value: string) => {
    setSlots(slots.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveSlots = async () => {
    if (slots.length === 0) { toast.error("슬롯을 1개 이상 추가하세요"); return; }
    setSaving(true);
    try {
      await api.setSigningSlots(consultationId, slots);
      toast.success("슬롯 제시 완료 — 입주민 앱에 알림 발송됨");
      // 새 슬롯 제시 시 선택 초기화
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
      toast.success("자서 일정 확정 — 입주민 앱에 알림 발송됨");
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        background: "white",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📅 자서 일정 관리</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>불러오는 중...</p>
          ) : (
            <>
              {/* 확정된 일정 */}
              {confirmedAt && (
                <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ background: "#16a34a", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Check size={12} /> 확정됨
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: 0 }}>
                    {signingDate} {signingTime} · {signingLocation}
                  </p>
                </div>
              )}

              {/* 입주민 선택분 + 확정 버튼 */}
              {!confirmedAt && selectedIdx !== null && slots[selectedIdx] && (
                <div style={{ background: "#dbeafe", border: "2px solid #3b82f6", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: "#1e40af", fontWeight: 700, margin: "0 0 6px 0" }}>👤 입주민 선택</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", margin: "0 0 10px 0" }}>
                    {formatDateLabel(slots[selectedIdx].date)} {slots[selectedIdx].time} · {slots[selectedIdx].location}
                  </p>
                  <button
                    onClick={confirm}
                    disabled={saving}
                    style={{
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    {saving ? "처리 중..." : "✅ 이 일정으로 확정 (입주민 푸시 발송)"}
                  </button>
                </div>
              )}

              {/* 슬롯 편집 */}
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#374151" }}>제시할 슬롯</h3>
                {!confirmedAt && (
                  <button onClick={addSlot} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Plus size={14} /> 슬롯 추가
                  </button>
                )}
              </div>

              {slots.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9ca3af", padding: 16, textAlign: "center", background: "#f9fafb", borderRadius: 8 }}>
                  아직 제시된 일정이 없습니다. "슬롯 추가"로 시작하세요.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {slots.map((s, i) => {
                    const isSelected = i === selectedIdx;
                    return (
                      <div key={i} style={{
                        border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 12,
                        background: isSelected ? "#eff6ff" : "white",
                      }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input
                            type="date"
                            value={s.date}
                            onChange={e => updateSlot(i, "date", e.target.value)}
                            disabled={!!confirmedAt}
                            style={{ flex: 1, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                          />
                          <input
                            type="time"
                            value={s.time}
                            onChange={e => updateSlot(i, "time", e.target.value)}
                            disabled={!!confirmedAt}
                            step="3600"
                            style={{ width: 110, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                          />
                          {!confirmedAt && (
                            <button onClick={() => removeSlot(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={s.location}
                          onChange={e => updateSlot(i, "location", e.target.value)}
                          disabled={!!confirmedAt}
                          placeholder="장소 (예: 부전동지점 2층)"
                          style={{ width: "100%", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                        />
                        {isSelected && (
                          <p style={{ fontSize: 11, color: "#1d4ed8", margin: "6px 0 0 0", fontWeight: 600 }}>
                            ⭐ 입주민이 이 슬롯 선택함
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!confirmedAt && !loading && (
          <div style={{ padding: 16, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, background: "white", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              닫기
            </button>
            <button
              onClick={saveSlots}
              disabled={saving || slots.length === 0}
              style={{
                flex: 2,
                background: "#1e3a8a",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                opacity: (saving || slots.length === 0) ? 0.5 : 1,
              }}
            >
              {saving ? "저장 중..." : "📤 입주민에게 슬롯 제시"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
