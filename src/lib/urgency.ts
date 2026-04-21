// v3 §4.4 긴급도 판정 규칙 엔진
// 단순 SLA 체류일 + 입주일 D-day 교차 판정 + 추가 규칙

export type UrgencyLevel = "normal" | "warning" | "urgent" | "critical";

export type ConsultationLike = Record<string, any>;

export interface UrgencyHit {
  id: string;
  level: UrgencyLevel;
  message: string;
}

const LEVEL_RANK: Record<UrgencyLevel, number> = {
  normal: 0, warning: 1, urgent: 2, critical: 3,
};

// v3 §4.1 단계별 SLA (정상 / 주의 / 긴급 / 위험 임계 일수)
const STAGE_SLA: Record<string, { warning: number; urgent: number; critical: number }> = {
  apply:               { warning: 1, urgent: 3, critical: 7 },
  consulting:          { warning: 4, urgent: 8, critical: 14 },
  reviewing:           { warning: 3, urgent: 5, critical: 7 },
  result:              { warning: 2, urgent: 3, critical: 5 },
  signing_reservation: { warning: 4, urgent: 7, critical: 10 },
  signing:             { warning: 3, urgent: 4, critical: 6 },
  executing:           { warning: 0, urgent: 1, critical: 2 },
};

const dayDiff = (target: Date, now: Date) =>
  Math.floor((target.getTime() - now.getTime()) / 86400000);

const parseDate = (v?: string) => v ? new Date(v) : null;

const stageDays = (r: ConsultationLike, now: Date) => {
  const d = parseDate(r.stage_changed_at);
  return d ? Math.floor((now.getTime() - d.getTime()) / 86400000) : null;
};

// 한 행에 대한 모든 적용 규칙 평가 → 가장 높은 레벨의 hit 반환 (없으면 null)
export function evaluateUrgency(r: ConsultationLike, now: Date = new Date()): UrgencyHit | null {
  const hits: UrgencyHit[] = [];
  const stage = (r.loan_status ?? "apply") as string;
  const movingIn = parseDate(r.moving_in_date);
  const dDay = movingIn ? dayDiff(movingIn, now) : null;
  const stayed = stageDays(r, now);

  // §4.1 단계별 SLA
  const sla = STAGE_SLA[stage];
  if (sla && stayed !== null) {
    if (stayed >= sla.critical) hits.push({ id: r.id, level: "critical", message: `${stage} ${stayed}일 체류 (위험)` });
    else if (stayed >= sla.urgent) hits.push({ id: r.id, level: "urgent", message: `${stage} ${stayed}일 체류 (긴급)` });
    else if (stayed >= sla.warning) hits.push({ id: r.id, level: "warning", message: `${stage} ${stayed}일 체류` });
  }

  // §4.2 입주일 D-day 교차 판정
  if (dDay !== null && stage !== "done" && stage !== "cancel") {
    const signed = ["signing", "executing"].includes(stage);
    const executed = stage === "done";

    if (signed && !executed && dDay < 0) {
      hits.push({ id: r.id, level: "critical", message: `자서 완료/실행 미완 + 입주일 ${-dDay}일 경과` });
    } else if (signed && !executed && dDay === 0) {
      hits.push({ id: r.id, level: "critical", message: "자서 완료/실행 미완 + 입주일 당일 (최우선)" });
    } else if (!["signing", "executing", "done"].includes(stage) && dDay >= 0 && dDay <= 3) {
      hits.push({ id: r.id, level: "critical", message: `자서 미완 + 입주 D-${dDay} (최우선)` });
    } else if (signed && !executed && dDay > 0 && dDay <= 3) {
      hits.push({ id: r.id, level: "urgent", message: `자서 완료/실행 미완 + 입주 D-${dDay}` });
    }
  }

  // §4.3 추가 긴급 규칙
  // 1. 이사일 D-3 이내인데 실행 안됨
  if (dDay !== null && dDay >= 0 && dDay <= 3 && stage !== "done" && stage !== "cancel") {
    hits.push({ id: r.id, level: "critical", message: `이사일 D-${dDay} · 미실행` });
  }
  // 4. 자서일에 필요 서류 미준비
  if (r.signing_date) {
    const signingDay = parseDate(r.signing_date);
    if (signingDay && dayDiff(signingDay, now) === 0) {
      const docs = (r.documents_checked || "").split(",").filter(Boolean).length;
      if (docs < 4) hits.push({ id: r.id, level: "urgent", message: "자서일 · 필수서류 미수령" });
    }
  }
  // 가심사 결과 통보 미완 + 결과대기 2일 이상
  if (stage === "result" && !r.approved_notified_at && stayed !== null && stayed >= 2) {
    hits.push({ id: r.id, level: "urgent", message: `결과대기 ${stayed}일 · 통보 미완` });
  }

  if (hits.length === 0) return null;
  // 최고 레벨 선택
  hits.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
  return hits[0];
}

export const levelClasses: Record<UrgencyLevel, { bg: string; text: string; border: string; label: string }> = {
  normal:   { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200",   label: "정상" },
  warning:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  label: "주의" },
  urgent:   { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", label: "긴급" },
  critical: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-300",    label: "최우선" },
};

// 입주기간 자동 판정: 단지 입주일 평균 D-14 ~ D+7 사이면 입주기간 모드
export function detectMoveInMode(rows: ConsultationLike[], now: Date = new Date()): boolean {
  const recent = rows
    .map(r => r.moving_in_date ? dayDiff(new Date(r.moving_in_date), now) : null)
    .filter((d): d is number => d !== null && d >= -7 && d <= 14);
  return recent.length >= 5; // 5건 이상이면 입주기간으로 간주
}
