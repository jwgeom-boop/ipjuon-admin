import type { FixtureSeed } from "./consultationFixtures";

export type DocStatus = "pending" | "received" | "missing";

export type DocumentCategory =
  | "공통"
  | "소득_재직자"
  | "소득_사업자"
  | "소득_기타"
  | "배우자_재직자"
  | "배우자_사업자";

export interface DocumentItem {
  id: string;
  name: string;
  required: boolean;
  status: DocStatus;
  note?: string;
  copies?: number;            // 발급 매수
  issuer?: string;            // 발급처
  category?: DocumentCategory;
  isOriginal?: boolean;       // 원본 필수
}

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  공통: "공통 (차주·담보제공자 각 1세트)",
  소득_재직자: "소득 — 재직자",
  소득_사업자: "소득 — 사업자",
  소득_기타: "소득 — 기타 방법",
  배우자_재직자: "배우자 합산 — 재직자",
  배우자_사업자: "배우자 합산 — 사업자",
};

export interface SignItem {
  id: string;
  name: string;
  signed: boolean;
  note?: string;
}

export interface SigningData {
  id: string;
  customerName: string;
  dongHo: string;
  complex: string;
  phone: string;
  dDay: string;

  signingDate: string;
  signingTime: string;
  signingLocation: string;

  bankBranch: string;
  bankContact: string;
  bankPhone: string;

  loanAmount: number;
  additionalLoan: number;
  scheduledExecutionDate: string;

  documents: DocumentItem[];
  signItems: SignItem[];

  remark: string;
}

/**
 * 자서 후 서류 수령 체크리스트 — 당사자 준비서류 LIST 기반.
 * 차주·담보제공자 각 1세트 + 소득 유형 택1 + 배우자 합산 시 추가.
 */
const DEFAULT_DOCS = (): DocumentItem[] => [
  // ===== 공통 =====
  { id: "resident-cert",   name: "주민등록 등본",        required: true, status: "pending", copies: 2, issuer: "행정복지센터", category: "공통", note: "3개월 이내, 뒷자리 공개" },
  { id: "resident-abstr",  name: "주민등록 초본",        required: true, status: "pending", copies: 2, issuer: "행정복지센터", category: "공통", note: "3개월 이내, 주소변동 포함" },
  { id: "seal-cert",       name: "개인인감증명서",       required: true, status: "pending", copies: 2, issuer: "행정복지센터", category: "공통", note: "3개월 이내" },
  { id: "family-cert",     name: "가족관계증명서 (상세)", required: true, status: "pending", copies: 1, issuer: "행정복지센터", category: "공통", note: "뒷자리 공개" },
  { id: "tax-national",    name: "국세 완납 증명서",      required: true, status: "pending", copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "tax-local",       name: "지방세 완납 증명서",    required: true, status: "pending", copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "tax-detail",      name: "지방세 세목별 과세 증명서", required: true, status: "pending", copies: 1, issuer: "행정복지센터", category: "공통" },
  { id: "insurance-paid",  name: "4대보험 완납 증명서",   required: true, status: "pending", copies: 1, issuer: "국민건강보험공단", category: "공통" },
  { id: "interim-loan",    name: "중도금 금융거래 확인서", required: true, status: "pending", copies: 1, issuer: "금융기관", category: "공통" },
  { id: "contract-orig",   name: "분양 계약서 및 별도품목 옵션계약서", required: true, status: "pending", copies: 1, issuer: "원본", category: "공통", isOriginal: true, note: "증여 시 — 증여계약서 / 전매 시 — 전매계약서" },
  { id: "estate-report",   name: "부동산 거래 계약 신고필증", required: true, status: "pending", copies: 1, issuer: "원본", category: "공통", isOriginal: true },
  { id: "household-list",  name: "담보물건 주소지 전입세대 열람내역서", required: true, status: "pending", copies: 1, issuer: "행정복지센터", category: "공통", note: "기당일 추가발급" },
  { id: "id-copies",       name: "채무자·세대주·세대원 신분증 사본", required: true, status: "pending", copies: 1, issuer: "기본증명서: 행정복지센터", category: "공통", note: "미성년자는 기본증명서(상세)" },
  { id: "personal-seal",   name: "개인 인감도장",         required: true, status: "pending", copies: 1, issuer: "자서 당일 지참", category: "공통" },

  // ===== 소득 (택1) =====
  { id: "emp-cert",        name: "재직증명서",            required: false, status: "pending", copies: 1, issuer: "재직회사", category: "소득_재직자", note: "재직회사 인감 날인 필수" },
  { id: "emp-tax-2years",  name: "2023·2024 원천징수영수증", required: false, status: "pending", copies: 1, issuer: "재직회사 및 홈택스", category: "소득_재직자", note: "재직회사·홈택스 인감 필" },
  { id: "emp-tax-2025",    name: "2025 원천수부",         required: false, status: "pending", copies: 1, issuer: "재직회사", category: "소득_재직자", note: "재직회사 날인 필" },
  { id: "biz-reg",         name: "사업자 등록증",         required: false, status: "pending", copies: 1, issuer: "원본", category: "소득_사업자" },
  { id: "biz-income-2y",   name: "2023·2024 소득금액증명원", required: false, status: "pending", copies: 1, issuer: "홈택스 및 세무서", category: "소득_사업자" },
  { id: "biz-vat",         name: "부가세 과세표준 증명원", required: false, status: "pending", copies: 1, issuer: "홈택스 및 세무서", category: "소득_사업자" },
  { id: "card-usage",      name: "신용카드 사용내역서",   required: false, status: "pending", copies: 1, issuer: "카드사 및 홈택스", category: "소득_기타", note: "연말정산용 (필요시)" },
  { id: "health-cert",     name: "건강보험자격득실확인서", required: false, status: "pending", copies: 1, issuer: "국민건강보험공단", category: "소득_기타", note: "필요시" },
  { id: "health-pay",      name: "최근 3개월 건강보험료 납부확인증", required: false, status: "pending", copies: 1, issuer: "국민건강보험공단", category: "소득_기타", note: "필요시" },

  // ===== 배우자 합산 시 =====
  { id: "sp-emp-cert",     name: "[배우자] 재직증명서",   required: false, status: "pending", copies: 1, issuer: "재직회사", category: "배우자_재직자", note: "재직회사 인감 날인 필수" },
  { id: "sp-emp-tax-2y",   name: "[배우자] 2023·2024 원천징수영수증", required: false, status: "pending", copies: 1, issuer: "재직회사 및 홈택스", category: "배우자_재직자", note: "재직회사·홈택스 인감 필" },
  { id: "sp-emp-tax-2025", name: "[배우자] 2025 원천수부", required: false, status: "pending", copies: 1, issuer: "재직회사", category: "배우자_재직자", note: "재직회사 날인 필" },
  { id: "sp-biz-reg",      name: "[배우자] 사업자 등록증", required: false, status: "pending", copies: 1, issuer: "원본", category: "배우자_사업자" },
  { id: "sp-biz-income",   name: "[배우자] 2023·2024 소득금액증명원", required: false, status: "pending", copies: 1, issuer: "홈택스 및 세무서", category: "배우자_사업자" },
  { id: "sp-biz-vat",      name: "[배우자] 부가세 과세표준 증명원", required: false, status: "pending", copies: 1, issuer: "홈택스 및 세무서", category: "배우자_사업자" },
];

const DEFAULT_SIGN = (): SignItem[] => [
  { id: "loan-agreement", name: "대출거래약정서", signed: false },
  { id: "mortgage", name: "근저당권설정계약서", signed: false },
  { id: "guarantee", name: "보증서 동의", signed: false, note: "HUG/HF" },
  { id: "auto-transfer", name: "자동이체 신청서", signed: false },
  { id: "privacy-consent", name: "개인정보 활용 동의서", signed: false },
  { id: "credit-consent", name: "신용정보 조회 동의서", signed: false },
];

const SIGNING_FIXTURES: Record<string, SigningData> = {
  "kim-okhee": {
    id: "kim-okhee",
    customerName: "김옥희",
    dongHo: "102-3006",
    complex: "봄여름가을겨울3차",
    phone: "010-3120-7788",
    dDay: "오늘 자서",
    signingDate: "2026-04-21",
    signingTime: "14:30",
    signingLocation: "국민은행 부전동지점 2층 상담실",
    bankBranch: "부전동",
    bankContact: "조연진 대리",
    bankPhone: "051-811-5131",
    loanAmount: 210000000,
    additionalLoan: 0,
    scheduledExecutionDate: "2026-04-25",
    documents: [
      { id: "id-card", name: "신분증", required: true, status: "received" },
      { id: "resident-cert", name: "주민등록등본", required: true, status: "received", note: "최근 3개월 이내" },
      { id: "resident-abstract", name: "주민등록초본", required: true, status: "received", note: "주소변동 포함" },
      { id: "family-cert", name: "가족관계증명서", required: true, status: "received" },
      { id: "seal-cert", name: "인감증명서", required: true, status: "pending", note: "대출용 1통 — 자서 당일 지참" },
      { id: "seal", name: "인감도장", required: true, status: "pending" },
      { id: "bankbook", name: "본인 통장", required: true, status: "received", note: "이체용" },
      { id: "contract-copy", name: "분양계약서 사본", required: true, status: "received" },
      { id: "income-proof", name: "소득증빙서류", required: false, status: "received", note: "재직증명서" },
    ],
    signItems: DEFAULT_SIGN(),
    remark: "고객 14:00까지 도착 예정 — 인감 지참 재안내 완료",
  },
  "cho-yoonkyung": {
    id: "cho-yoonkyung",
    customerName: "조윤경",
    dongHo: "102-1805",
    complex: "봄여름가을겨울3차",
    phone: "010-7755-3321",
    dDay: "D-3",
    signingDate: "2026-04-24",
    signingTime: "10:00",
    signingLocation: "국민은행 부전동지점 2층 상담실",
    bankBranch: "부전동",
    bankContact: "조연진 대리",
    bankPhone: "051-811-5131",
    loanAmount: 195000000,
    additionalLoan: 0,
    scheduledExecutionDate: "2026-04-28",
    documents: [
      { id: "id-card", name: "신분증", required: true, status: "received" },
      { id: "resident-cert", name: "주민등록등본", required: true, status: "missing", note: "고객 재발급 요청 — 4/22 도착 예정" },
      { id: "resident-abstract", name: "주민등록초본", required: true, status: "pending", note: "주소변동 포함" },
      { id: "family-cert", name: "가족관계증명서", required: true, status: "received" },
      { id: "seal-cert", name: "인감증명서", required: true, status: "pending", note: "대출용 1통" },
      { id: "seal", name: "인감도장", required: true, status: "pending" },
      { id: "bankbook", name: "본인 통장", required: true, status: "pending" },
      { id: "contract-copy", name: "분양계약서 사본", required: true, status: "received" },
      { id: "income-proof", name: "소득증빙서류", required: false, status: "pending" },
    ],
    signItems: DEFAULT_SIGN(),
    remark: "주민등록등본 재발급 대기 — 도착 즉시 자서 일정 확정 안내",
  },
  "han-oyoung": {
    id: "han-oyoung",
    customerName: "한오영",
    dongHo: "101-603",
    complex: "봄여름가을겨울3차",
    phone: "010-4422-1502",
    dDay: "자서완료 +4일",
    signingDate: "2026-04-17",
    signingTime: "11:00",
    signingLocation: "국민은행 부전동지점 2층 상담실",
    bankBranch: "부전동",
    bankContact: "조연진 대리",
    bankPhone: "051-811-5131",
    loanAmount: 180000000,
    additionalLoan: 0,
    scheduledExecutionDate: "2026-04-22",
    documents: DEFAULT_DOCS().map((d) => ({ ...d, status: "received" as DocStatus })),
    signItems: DEFAULT_SIGN().map((s) => ({ ...s, signed: true })),
    remark: "자서 완료 — 4/22 실행 예정",
  },
};

export function getSigningFixture(id: string, seed?: FixtureSeed): SigningData {
  const base = SIGNING_FIXTURES[id] ?? SIGNING_FIXTURES["kim-okhee"];
  if (!seed) return { ...base, id };
  return {
    ...base,
    id,
    customerName: seed.customerName ?? base.customerName,
    dongHo: seed.dongHo ?? base.dongHo,
    complex: seed.complex ?? base.complex,
    phone: seed.phone ?? base.phone,
  };
}

export function getAllSigningFixtures(): SigningData[] {
  return Object.values(SIGNING_FIXTURES);
}
