import { getAllSigningFixtures } from "./signingFixtures";
import { getConsultationFixture } from "./consultationFixtures";

export type LocationKind = "bank" | "custom";

export interface ReservationLocation {
  kind: LocationKind;
  // bank: 해당은행(자동) — 표시는 bankBranchLabel 사용
  // custom: 자유 입력 — customLabel에 저장
  customLabel?: string;
}

export interface ReservationDoc {
  id: string;
  name: string;
  note?: string;
}

export interface ReservationData {
  id: string;
  customerName: string;
  dongHo: string;
  complex: string;
  phone: string;
  dDay: string;

  /* 자서 일정 */
  signingDate: string; // YYYY-MM-DD
  signingTime: string; // HH:mm

  /* 자서 장소 */
  location: ReservationLocation;
  bankBranchLabel: string; // ex) "국민은행 부전동지점 2층 상담실"

  /* 동석자 */
  spouseAccompany: boolean;
  companionNote: string;

  /* 필요서류 — 안내용 나열 (개별 체크 없음) */
  documents: ReservationDoc[];

  remark: string;
}

export const DEFAULT_DOCS = (): ReservationDoc[] => [
  { id: "id-card", name: "신분증" },
  { id: "seal-cert", name: "인감증명서", note: "대출용 1통" },
  { id: "resident-cert", name: "주민등록등본", note: "최근 3개월 이내" },
  { id: "family-cert", name: "가족관계증명서" },
  { id: "income-proof", name: "소득증빙", note: "재직증명서 또는 원천징수영수증" },
  { id: "bankbook", name: "본인 통장 사본" },
  { id: "contract", name: "분양계약서 사본" },
  { id: "seal", name: "인감도장(자서 당일)" },
];

const RESERVATION_FIXTURES: Record<string, ReservationData> = {
  "kim-okhee": {
    id: "kim-okhee",
    customerName: "김옥희",
    dongHo: "102-3006",
    complex: "봄여름가을겨울3차",
    phone: "010-3120-7788",
    dDay: "D-7",
    signingDate: "2026-04-30",
    signingTime: "14:30",
    location: { kind: "bank" },
    bankBranchLabel: "국민은행 부전동지점 2층 상담실",
    spouseAccompany: true,
    companionNote: "배우자 동반(공동명의 — 김옥희·박상준), 14:00 별도 도착",
    documents: DEFAULT_DOCS(),
    remark: "배우자 동석 확정 — 14:00까지 도착 안내 완료",
  },
  "reservation-jung-haeran": {
    id: "reservation-jung-haeran",
    customerName: "정해란",
    dongHo: "105-2102",
    complex: "봄여름가을겨울3차",
    phone: "010-7720-3344",
    dDay: "D-5",
    signingDate: "",
    signingTime: "",
    location: { kind: "bank" },
    bankBranchLabel: "",
    spouseAccompany: false,
    companionNote: "",
    documents: DEFAULT_DOCS(),
    remark: "고객 희망일: 5/2(금) 오후, 5/6(화) 오전 — 본점 또는 부전동 가능",
  },
};

export function getReservationFixture(id: string): ReservationData {
  if (RESERVATION_FIXTURES[id]) return RESERVATION_FIXTURES[id];

  // signing fixture에 같은 id가 있으면 prefill (재예약·일정 변경 케이스)
  const signing = getAllSigningFixtures().find((s) => s.id === id);
  if (signing) {
    return {
      id,
      customerName: signing.customerName,
      dongHo: signing.dongHo,
      complex: signing.complex,
      phone: signing.phone,
      dDay: signing.dDay,
      signingDate: signing.signingDate ?? "",
      signingTime: signing.signingTime ?? "",
      location: { kind: "bank" },
      bankBranchLabel: signing.signingLocation ?? "",
      spouseAccompany: false,
      companionNote: "",
      documents: DEFAULT_DOCS(),
      remark: "",
    };
  }

  // 상담 fixture에 같은 id가 있으면 prefill (상담 → 자서예약 전환 케이스)
  // getConsultationFixture는 매칭 실패 시 디폴트로 폴백하므로, id 일치 여부로 판별.
  const consult = getConsultationFixture(id);
  if (consult.id === id) {
    return {
      id,
      customerName: consult.customerName,
      dongHo: consult.dongHo,
      complex: consult.complex,
      phone: consult.phone,
      dDay: consult.dDay,
      signingDate: consult.scheduledSigningDate || consult.availableSigningDate || "",
      signingTime: "",
      location: { kind: "bank" },
      bankBranchLabel: "",
      spouseAccompany: !!consult.spousePhone,
      companionNote: consult.spousePhone
        ? `배우자 연락처: ${consult.spousePhone}`
        : "",
      documents: DEFAULT_DOCS(),
      remark: "",
    };
  }

  // 매칭되는 데이터가 전혀 없으면 빈 폼.
  return {
    id,
    customerName: "",
    dongHo: "",
    complex: "",
    phone: "",
    dDay: "",
    signingDate: "",
    signingTime: "",
    location: { kind: "bank" },
    bankBranchLabel: "",
    spouseAccompany: false,
    companionNote: "",
    documents: DEFAULT_DOCS(),
    remark: "",
  };
}

const RECENT_LOCATIONS_KEY = "v4.wizard.reservation.recentLocations";
const RECENT_LIMIT = 5;

export function getRecentLocations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_LOCATIONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentLocation(label: string) {
  if (typeof window === "undefined") return;
  const trimmed = label.trim();
  if (!trimmed) return;
  const current = getRecentLocations().filter((l) => l !== trimmed);
  current.unshift(trimmed);
  const next = current.slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}
