import { getAllSigningFixtures } from "./signingFixtures";
import { getConsultationFixture, type FixtureSeed } from "./consultationFixtures";

export type LocationKind = "bank" | "custom";

export interface ReservationLocation {
  kind: LocationKind;
  // bank: 해당은행(자동) — 표시는 bankBranchLabel 사용
  // custom: 자유 입력 — customLabel에 저장
  customLabel?: string;
}

export type ReservationDocCategory =
  | "공통"
  | "소득_재직자"
  | "소득_사업자"
  | "소득_기타"
  | "배우자_재직자"
  | "배우자_사업자";

export interface ReservationDoc {
  id: string;
  name: string;
  note?: string;
  copies?: number;            // 발급 매수
  issuer?: string;            // 발급처
  category?: ReservationDocCategory;
  isOriginal?: boolean;       // 원본 필수 표시
  conditional?: string;       // "택1" 등 조건 안내
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

/**
 * 당사자 준비서류 LIST — 차주·담보제공자 각각 1세트씩 준비.
 * (실제 자서 당일 지참 안내 양식 기반)
 */
export const DEFAULT_DOCS = (): ReservationDoc[] => [
  // ===== 공통 (차주·담보제공자 각각 준비) =====
  { id: "resident-cert",   name: "주민등록 등본",        note: "3개월 이내 발급분, 뒷자리 공개", copies: 2, issuer: "행정복지센터", category: "공통" },
  { id: "resident-abstr",  name: "주민등록 초본",        note: "3개월 이내, 과거 주소 변동 포함", copies: 2, issuer: "행정복지센터", category: "공통" },
  { id: "seal-cert",       name: "개인인감증명서",        note: "3개월 이내 발급",                copies: 2, issuer: "행정복지센터", category: "공통" },
  { id: "family-cert",     name: "가족관계증명서 (상세)", note: "주민등록 뒷자리 공개 필수",        copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "tax-national",    name: "국세 완납 증명서",                                              copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "tax-local",       name: "지방세 완납 증명서",                                            copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "tax-detail",      name: "지방세 세목별 과세 증명서",                                     copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "insurance-paid",  name: "4대보험 완납 증명서",                                          copies: 1, issuer: "국민건강보험공단", category: "공통" },
  { id: "interim-loan",    name: "중도금 금융거래 확인서",                                        copies: 1, issuer: "금융기관", category: "공통" },
  { id: "contract-orig",   name: "분양 계약서 및 별도품목 옵션계약서",
                           note: "증여 시 — 증여계약서 / 전매 시 — 전매계약서",
                                                                                               copies: 1, issuer: "원본", category: "공통", isOriginal: true },
  { id: "estate-report",   name: "부동산 거래 계약 신고필증",                                     copies: 1, issuer: "원본", category: "공통", isOriginal: true },
  { id: "household-list",  name: "담보물건 주소지 전입세대 열람내역서", note: "기당일 추가발급",  copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "id-copies",       name: "채무자 신분증, 세대주 및 세대원 신분증 사본",
                           note: "세대원 중 신분증없는 미성년자 경우, 기본증명서(상세)",
                                                                                               copies: 1, issuer: "기본증명서: 행정복지센터", category: "공통" },
  { id: "personal-seal",   name: "개인 인감도장",                                                 copies: 1, issuer: "자서 당일 지참", category: "공통" },

  // ===== 소득 — 재직자인 경우 (택1) =====
  { id: "emp-cert",        name: "재직증명서",                  note: "재직회사 인감 날인 필수",          copies: 1, issuer: "재직회사", category: "소득_재직자" },
  { id: "emp-tax-2years",  name: "2023·2024년도 근로소득원천징수영수증", note: "재직회사 및 홈택스 인감날인 필", copies: 1, issuer: "재직회사 및 홈택스", category: "소득_재직자" },
  { id: "emp-tax-2025",    name: "2025년도 근로소득원천수부",   note: "재직회사 날인 필",                 copies: 1, issuer: "재직회사", category: "소득_재직자" },

  // ===== 소득 — 사업자인 경우 (택1) =====
  { id: "biz-reg",         name: "사업자 등록증",                                                copies: 1, issuer: "원본", category: "소득_사업자" },
  { id: "biz-income-2y",   name: "2023·2024년도 소득금액증명원",                                copies: 1, issuer: "홈택스 및 세무서", category: "소득_사업자" },
  { id: "biz-vat",         name: "부가세 과세표준 증명원",                                        copies: 1, issuer: "홈택스 및 세무서", category: "소득_사업자" },

  // ===== 소득 — 기타 방법 (택1) =====
  { id: "card-usage",      name: "신용카드 사용내역서",          note: "연말정산용 (필요시)",              copies: 1, issuer: "카드사 및 홈택스", category: "소득_기타" },
  { id: "health-cert",     name: "건강보험자격득실확인서",        note: "필요시",                          copies: 1, issuer: "국민건강보험공단", category: "소득_기타" },
  { id: "health-pay",      name: "최근 3개월 건강보험료 납부확인증", note: "필요시",                       copies: 1, issuer: "국민건강보험공단", category: "소득_기타" },

  // ===== 배우자 소득 합산 시 =====
  { id: "sp-emp-cert",     name: "[배우자] 재직증명서",          note: "재직회사 인감 날인 필수",          copies: 1, issuer: "재직회사", category: "배우자_재직자" },
  { id: "sp-emp-tax-2y",   name: "[배우자] 2023·2024 원천징수영수증", note: "재직회사·홈택스 인감 필",  copies: 1, issuer: "재직회사 및 홈택스", category: "배우자_재직자" },
  { id: "sp-emp-tax-2025", name: "[배우자] 2025 원천수부",      note: "재직회사 날인 필",                 copies: 1, issuer: "재직회사", category: "배우자_재직자" },
  { id: "sp-biz-reg",      name: "[배우자] 사업자 등록증",                                        copies: 1, issuer: "원본", category: "배우자_사업자" },
  { id: "sp-biz-income",   name: "[배우자] 2023·2024 소득금액증명원",                            copies: 1, issuer: "홈택스 및 세무서", category: "배우자_사업자" },
  { id: "sp-biz-vat",      name: "[배우자] 부가세 과세표준 증명원",                                copies: 1, issuer: "홈택스 및 세무서", category: "배우자_사업자" },
];

export const DOC_CATEGORY_LABEL: Record<ReservationDocCategory, string> = {
  공통: "공통 (차주·담보제공자 각 1세트)",
  소득_재직자: "소득 — 재직자",
  소득_사업자: "소득 — 사업자",
  소득_기타: "소득 — 기타 방법",
  배우자_재직자: "배우자 합산 — 재직자",
  배우자_사업자: "배우자 합산 — 사업자",
};

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

export function getReservationFixture(id: string, seed?: FixtureSeed): ReservationData {
  if (RESERVATION_FIXTURES[id]) return RESERVATION_FIXTURES[id];

  // seed (인박스 행 데이터)가 있으면 우선 적용
  if (seed) {
    return {
      id,
      customerName: seed.customerName ?? "",
      dongHo: seed.dongHo ?? "",
      complex: seed.complex ?? "",
      phone: seed.phone ?? "",
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
