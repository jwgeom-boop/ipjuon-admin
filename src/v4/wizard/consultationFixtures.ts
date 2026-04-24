export type ContactMethod = "전화" | "문자" | "카카오" | "방문";
export type ContactResult = "연결" | "부재중" | "거절" | "전화끊김" | "회신대기";

export interface ContactAttempt {
  id: string;
  date: string;
  time: string;
  method: ContactMethod;
  result: ContactResult;
  note?: string;
}

export type IntakeSource = "시행사 명단" | "본인 문의" | "추천" | "재접수" | "기타";
export type NextStep = "자서예약" | "가심사" | "후속연락" | "보류" | "타행이관" | "미정";

export type HousingStatus = "선택" | "무주택" | "1주택 처분조건" | "1주택 보유" | "다주택";
export type CreditBureau = "CB" | "NICE" | "KCB";
export type LoanType = "조합" | "일반" | "중도금" | "기타";
export type LoanProduct = "고정" | "변동" | "혼합";
export type RepaymentMethod = "원리금" | "원금균등" | "만기일시";
export type Ownership = "단독" | "공동";
export type EmploymentType = "선택" | "직장" | "자영업" | "프리랜서" | "기타";
export type DocStatus = "대기" | "요청함" | "받음";

export interface RequiredDoc {
  id: string;
  label: string;
  required: boolean;
  status: DocStatus;
  requestedAt?: string;
  hint?: string;
}

export interface ConsultationData {
  id: string;
  customerName: string;
  dongHo: string;
  complex: string;
  phone: string;
  dDay: string;

  /* 고객 기본 */
  residentNumber: string;
  spousePhone: string;
  dong: string;
  ho: string;
  unitType: string;
  ownership: Ownership;
  isOriginalBuyer: boolean;
  executionDate: string;
  resaleDate: string;

  /* 접수 정보 */
  intakeDate: string;
  intakeSource: IntakeSource;
  receivedBy: string;

  /* 고객 현황 */
  housingStatus: HousingStatus;
  creditBureau: CreditBureau;
  creditScore: number;
  existingCreditLoan: number;
  existingMortgage: number;
  otherLoansNote: string;
  salePrice: number;
  annualIncome: number;
  employmentType: EmploymentType;
  employmentYears: number;
  isFirstTimeHomebuyer: boolean;
  isHouseholdHead: boolean;

  /* 대출 조건 */
  loanType: LoanType;
  loanProduct: LoanProduct;
  repaymentMethod: RepaymentMethod;
  loanPeriodYears: number;
  gracePeriodYears: number;
  loanOfficer: string;

  /* 금액 */
  applicationAmount: number;
  customerPrep: number;
  approvedAmount: number;
  interestRate: number;
  additionalLoan: number;

  /* 일정 */
  documentDeliveryDate: string;
  scheduledSigningDate: string;
  scheduledExecutionDate: string;

  /* 상담 메모 */
  desiredLoanAmount: number;
  availableSigningDate: string;
  consultationMemo: string;

  /* 컨택 기록 */
  attempts: ContactAttempt[];

  /* 필수 서류 */
  requiredDocs: RequiredDoc[];

  /* 다음 단계 */
  nextStep: NextStep;
  nextActionDate: string;
}

const DEFAULT_DOCS = (): RequiredDoc[] => [
  { id: "id-card", label: "신분증", required: true, status: "대기" },
  { id: "income-proof", label: "소득자료 2개년", required: true, status: "대기", hint: "대체: 카드내역, 건강보험내역 등" },
  { id: "consent", label: "동의서", required: true, status: "대기" },
  { id: "contract", label: "분양계약서", required: true, status: "대기" },
];

const CONSULTATION_FIXTURES: Record<string, ConsultationData> = {
  "new-choi-seyoung": {
    id: "new-choi-seyoung",
    customerName: "최세영",
    dongHo: "104-1502",
    complex: "봄여름가을겨울3차",
    phone: "010-9911-2034",
    dDay: "신규 · 2시간 전 접수",
    residentNumber: "",
    spousePhone: "",
    dong: "104",
    ho: "1502",
    unitType: "84",
    ownership: "단독",
    isOriginalBuyer: true,
    executionDate: "",
    resaleDate: "",
    intakeDate: "2026-04-21",
    intakeSource: "시행사 명단",
    receivedBy: "조연진 대리",
    housingStatus: "선택",
    creditBureau: "CB",
    creditScore: 0,
    existingCreditLoan: 0,
    existingMortgage: 0,
    otherLoansNote: "",
    salePrice: 0,
    annualIncome: 0,
    employmentType: "선택",
    employmentYears: 0,
    isFirstTimeHomebuyer: false,
    isHouseholdHead: false,
    loanType: "조합",
    loanProduct: "고정",
    repaymentMethod: "원리금",
    loanPeriodYears: 30,
    gracePeriodYears: 1,
    loanOfficer: "",
    applicationAmount: 0,
    customerPrep: 0,
    approvedAmount: 0,
    interestRate: 0,
    additionalLoan: 0,
    documentDeliveryDate: "",
    scheduledSigningDate: "",
    scheduledExecutionDate: "",
    desiredLoanAmount: 0,
    availableSigningDate: "",
    consultationMemo: "",
    attempts: [],
    requiredDocs: DEFAULT_DOCS(),
    nextStep: "미정",
    nextActionDate: "",
  },
  "new-yang-jihye": {
    id: "new-yang-jihye",
    customerName: "양지혜",
    dongHo: "103-807",
    complex: "봄여름가을겨울3차",
    phone: "010-3344-5566",
    dDay: "신규 · 5시간 전 접수",
    residentNumber: "880515-2******",
    spousePhone: "010-3344-5567",
    dong: "103",
    ho: "807",
    unitType: "74",
    ownership: "공동",
    isOriginalBuyer: true,
    executionDate: "2026-05-15",
    resaleDate: "",
    intakeDate: "2026-04-21",
    intakeSource: "본인 문의",
    receivedBy: "조연진 대리",
    housingStatus: "무주택",
    creditBureau: "CB",
    creditScore: 812,
    existingCreditLoan: 0,
    existingMortgage: 0,
    otherLoansNote: "",
    salePrice: 480000000,
    annualIncome: 58000000,
    employmentType: "직장",
    employmentYears: 4,
    isFirstTimeHomebuyer: true,
    isHouseholdHead: true,
    loanType: "조합",
    loanProduct: "고정",
    repaymentMethod: "원리금",
    loanPeriodYears: 30,
    gracePeriodYears: 1,
    loanOfficer: "조연진 대리",
    applicationAmount: 220000000,
    customerPrep: 30000000,
    approvedAmount: 0,
    interestRate: 4.25,
    additionalLoan: 0,
    documentDeliveryDate: "2026-04-25",
    scheduledSigningDate: "",
    scheduledExecutionDate: "2026-05-15",
    desiredLoanAmount: 220000000,
    availableSigningDate: "",
    consultationMemo: "토요일 자서 가능 지점 확인 후 회신 예정 · 자서 가능 시기 확인 필요 (평일 휴가 어려움)",
    attempts: [
      {
        id: "a1",
        date: "2026-04-21",
        time: "10:15",
        method: "전화",
        result: "연결",
        note: "본인 통화 — 토요일 자서 가능 여부 문의",
      },
    ],
    requiredDocs: DEFAULT_DOCS().map((d) => {
      if (d.id === "id-card" || d.id === "consent") return { ...d, status: "받음" as const };
      if (d.id === "income-proof") return { ...d, status: "요청함" as const, requestedAt: "2026-04-21 10:30" };
      return d;
    }),
    nextStep: "후속연락",
    nextActionDate: "2026-04-22",
  },
  "uncontacted-lee-jaemin": {
    id: "uncontacted-lee-jaemin",
    customerName: "이재민",
    dongHo: "101-1803",
    complex: "봄여름가을겨울3차",
    phone: "010-2233-4455",
    dDay: "D+2 · 미상담",
    residentNumber: "",
    spousePhone: "",
    dong: "101",
    ho: "1803",
    unitType: "84",
    ownership: "단독",
    isOriginalBuyer: true,
    executionDate: "",
    resaleDate: "",
    intakeDate: "2026-04-19",
    intakeSource: "시행사 명단",
    receivedBy: "조연진 대리",
    housingStatus: "선택",
    creditBureau: "CB",
    creditScore: 0,
    existingCreditLoan: 0,
    existingMortgage: 0,
    otherLoansNote: "",
    salePrice: 0,
    annualIncome: 0,
    employmentType: "선택",
    employmentYears: 0,
    isFirstTimeHomebuyer: false,
    isHouseholdHead: false,
    loanType: "조합",
    loanProduct: "고정",
    repaymentMethod: "원리금",
    loanPeriodYears: 30,
    gracePeriodYears: 1,
    loanOfficer: "",
    applicationAmount: 0,
    customerPrep: 0,
    approvedAmount: 0,
    interestRate: 0,
    additionalLoan: 0,
    documentDeliveryDate: "",
    scheduledSigningDate: "",
    scheduledExecutionDate: "",
    desiredLoanAmount: 0,
    availableSigningDate: "",
    consultationMemo: "전화 3회 부재 — 문자 회신 대기 중",
    attempts: [
      { id: "a1", date: "2026-04-19", time: "14:20", method: "전화", result: "부재중" },
      { id: "a2", date: "2026-04-20", time: "10:05", method: "전화", result: "부재중" },
      { id: "a3", date: "2026-04-20", time: "16:40", method: "전화", result: "부재중" },
      { id: "a4", date: "2026-04-21", time: "09:30", method: "문자", result: "회신대기", note: "안내 문자 발송" },
    ],
    requiredDocs: DEFAULT_DOCS(),
    nextStep: "후속연락",
    nextActionDate: "2026-04-22",
  },
  "uncontacted-song-minho": {
    id: "uncontacted-song-minho",
    customerName: "송민호",
    dongHo: "102-605",
    complex: "봄여름가을겨울3차",
    phone: "010-7788-9911",
    dDay: "D+1 · 미상담",
    residentNumber: "",
    spousePhone: "",
    dong: "102",
    ho: "605",
    unitType: "59",
    ownership: "단독",
    isOriginalBuyer: true,
    executionDate: "",
    resaleDate: "",
    intakeDate: "2026-04-20",
    intakeSource: "시행사 명단",
    receivedBy: "조연진 대리",
    housingStatus: "선택",
    creditBureau: "CB",
    creditScore: 0,
    existingCreditLoan: 0,
    existingMortgage: 0,
    otherLoansNote: "",
    salePrice: 0,
    annualIncome: 0,
    employmentType: "선택",
    employmentYears: 0,
    isFirstTimeHomebuyer: false,
    isHouseholdHead: false,
    loanType: "조합",
    loanProduct: "고정",
    repaymentMethod: "원리금",
    loanPeriodYears: 30,
    gracePeriodYears: 1,
    loanOfficer: "",
    applicationAmount: 0,
    customerPrep: 0,
    approvedAmount: 0,
    interestRate: 0,
    additionalLoan: 0,
    documentDeliveryDate: "",
    scheduledSigningDate: "",
    scheduledExecutionDate: "",
    desiredLoanAmount: 0,
    availableSigningDate: "",
    consultationMemo: "접수 후 첫 컨택 미실시 — 우선 처리 필요",
    attempts: [],
    requiredDocs: DEFAULT_DOCS(),
    nextStep: "미정",
    nextActionDate: "2026-04-21",
  },
};

export interface FixtureSeed {
  customerName?: string;
  dongHo?: string;
  complex?: string;
  phone?: string;
}

export function getConsultationFixture(id: string, seed?: FixtureSeed): ConsultationData {
  const base = CONSULTATION_FIXTURES[id] ?? CONSULTATION_FIXTURES["new-choi-seyoung"];
  if (!seed) return { ...base, id };
  const [seedDong = "", seedHo = ""] = (seed.dongHo ?? "").split("-");
  return {
    ...base,
    id,
    customerName: seed.customerName ?? base.customerName,
    dongHo: seed.dongHo ?? base.dongHo,
    complex: seed.complex ?? base.complex,
    phone: seed.phone ?? base.phone,
    dong: seedDong || base.dong,
    ho: seedHo || base.ho,
  };
}
