export type DocStatus = "pending" | "received" | "missing";

export interface DocumentItem {
  id: string;
  name: string;
  required: boolean;
  status: DocStatus;
  note?: string;
}

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

const DEFAULT_DOCS = (): DocumentItem[] => [
  { id: "id-card", name: "신분증", required: true, status: "pending" },
  { id: "resident-cert", name: "주민등록등본", required: true, status: "pending", note: "최근 3개월 이내" },
  { id: "resident-abstract", name: "주민등록초본", required: true, status: "pending", note: "주소변동 포함" },
  { id: "family-cert", name: "가족관계증명서", required: true, status: "pending" },
  { id: "seal-cert", name: "인감증명서", required: true, status: "pending", note: "대출용 1통" },
  { id: "seal", name: "인감도장", required: true, status: "pending" },
  { id: "bankbook", name: "본인 통장", required: true, status: "pending", note: "이체용" },
  { id: "contract-copy", name: "분양계약서 사본", required: true, status: "pending" },
  { id: "income-proof", name: "소득증빙서류", required: false, status: "pending", note: "재직증명서 또는 원천징수영수증" },
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

export function getSigningFixture(id: string): SigningData {
  return SIGNING_FIXTURES[id] ?? SIGNING_FIXTURES["kim-okhee"];
}

export function getAllSigningFixtures(): SigningData[] {
  return Object.values(SIGNING_FIXTURES);
}
