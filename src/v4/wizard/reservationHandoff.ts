/**
 * 자서예약 위저드(ReservationWizard)에서 자서 위저드(SigningWizard)로
 * 일정·장소 등 핵심 정보를 넘겨주는 가벼운 브릿지.
 *
 * - 임시 fixture 기반 데이터라 별도 백엔드/스토어가 없으므로 localStorage 사용.
 * - SigningWizard 진입 시 동일 caseId의 handoff가 있으면 fixture 위에 머지.
 * - 한 번 적용하고 지우는 방식이 아니라, 추가 수정·재진입에도 유지되도록 둠.
 */

const KEY_PREFIX = "v4.wizard.reservation.handoff.";

export interface ReservationHandoff {
  caseId: string;
  signingDate: string; // YYYY-MM-DD
  signingTime: string; // HH:mm
  signingLocation: string; // 통합된 라벨 (해당은행 or 자유입력)
  spouseAccompany: boolean;
  companionNote: string;
  remark: string;
  /** 마지막 확정 시각 (ISO) */
  confirmedAt: string;
}

function key(caseId: string) {
  return `${KEY_PREFIX}${caseId}`;
}

export function saveReservationHandoff(payload: Omit<ReservationHandoff, "confirmedAt">) {
  if (typeof window === "undefined") return;
  try {
    const full: ReservationHandoff = {
      ...payload,
      confirmedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(key(payload.caseId), JSON.stringify(full));
  } catch {
    /* noop */
  }
}

export function getReservationHandoff(caseId: string): ReservationHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(caseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.caseId !== "string") return null;
    return parsed as ReservationHandoff;
  } catch {
    return null;
  }
}

export function clearReservationHandoff(caseId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(caseId));
  } catch {
    /* noop */
  }
}

/**
 * caseId에 관계없이 모든 handoff snapshot을 돌려준다.
 * TeamCalendar 등에서 전체 자서예약 일정을 한꺼번에 표시할 때 사용.
 */
export function getAllReservationHandoffs(): ReservationHandoff[] {
  if (typeof window === "undefined") return [];
  const out: ReservationHandoff[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(KEY_PREFIX)) continue;
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && typeof parsed.caseId === "string") {
          out.push(parsed as ReservationHandoff);
        }
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    /* noop */
  }
  return out;
}
