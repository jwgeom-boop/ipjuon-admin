// 백엔드 ConsultationRequest → 프론트 TaskItem 매핑.
// 백엔드 9단계 loan_status를 프론트 tag 체계 (신규/재연락/자서예약/자서/실행)로 축약.

import type { TaskItem } from "../home/TaskRow";
import type { UrgencyLevel } from "@/lib/urgency";

export interface ConsultationDto {
  id: string;
  resident_name?: string | null;
  resident_phone?: string | null;
  vendor_name?: string | null;
  complex_name?: string | null;
  dong?: string | null;
  ho?: string | null;
  manager?: string | null;
  loan_status?: string | null;
  loan_amount?: number | null;
  execution_date?: string | null;   // YYYY-MM-DD
  receive_date?: string | null;
  document_date?: string | null;
  signing_date?: string | null;
  signing_time?: string | null;
  moving_in_date?: string | null;
  apt_type?: string | null;
  product?: string | null;
  memo?: string | null;
  stage_changed_at?: string | null; // ISO
}

const LOAN_STATUS_TO_TAG: Record<string, string> = {
  apply: "신규",
  consulting: "재연락",
  reviewing: "재연락",
  result: "재연락",
  signing_reservation: "자서예약",
  signing: "자서",
  executing: "실행",
  done: "완료",          // 대출 실행 완료 (cancel은 의도적으로 제외)
};

const NEXT_ACTION: Record<string, string> = {
  apply: "신규 접수, 상담 예약",
  consulting: "상담 진행, 서류 안내",
  reviewing: "심사 진행 중",
  result: "심사결과 통보",
  signing_reservation: "자서 예정",
  signing: "자서 후 서류 취합",
  executing: "실행 정산 확정",
  done: "실행 완료",
};

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function deriveUrgency(c: ConsultationDto): UrgencyLevel {
  const status = c.loan_status ?? "";
  // 실행 단계: 실행일 기준
  if (status === "executing") {
    const d = daysUntil(c.execution_date);
    if (d != null && d <= 0) return "critical";
    if (d != null && d <= 2) return "urgent";
    if (d != null && d <= 7) return "warning";
  }
  // 자서 단계: 자서일 기준
  if (status === "signing" || status === "signing_reservation") {
    const d = daysUntil(c.signing_date);
    if (d != null && d <= 0) return "critical";
    if (d != null && d <= 2) return "urgent";
    if (d != null && d <= 7) return "warning";
  }
  // 정체 (현재 단계에 5일 이상 머물면 warning)
  if (c.stage_changed_at) {
    const dwellDays = -daysUntil(c.stage_changed_at.slice(0, 10))!;
    if (dwellDays >= 5) return "warning";
  }
  return "normal";
}

export function mapConsultationToTask(c: ConsultationDto): TaskItem | null {
  const tag = c.loan_status ? LOAN_STATUS_TO_TAG[c.loan_status] : undefined;
  if (!tag) return null; // done/cancel 등 매핑 없음

  const dongHo = [c.dong ? `${c.dong}동` : "", c.ho ? `${c.ho}호` : ""]
    .filter(Boolean)
    .join(" ");
  const addressLabel = [dongHo, c.complex_name].filter(Boolean).join(" · ");

  const nextAction = NEXT_ACTION[c.loan_status ?? ""] ?? "확인 필요";

  return {
    id: c.id,
    urgency: deriveUrgency(c),
    customerName: c.resident_name ?? "(이름 없음)",
    addressLabel,
    nextAction,
    tag,
    phone: c.resident_phone ?? undefined,
    assignee: c.manager ?? undefined,
    signingDate: c.signing_date ?? undefined,
    signingDateLabel: c.signing_time
      ? `${c.signing_date ?? ""} ${c.signing_time}`.trim()
      : c.signing_date ?? undefined,
    loanAmount: c.loan_amount ?? undefined,
    executionDate: c.execution_date ?? undefined,
    moveInDate: c.moving_in_date ?? undefined,
    note: c.memo ?? undefined,
  };
}

export function mapConsultations(list: ConsultationDto[]): TaskItem[] {
  return list.map(mapConsultationToTask).filter((t): t is TaskItem => t !== null);
}
