import type { FixtureSeed } from "./consultationFixtures";

export interface ExecutionData {
  id: string;
  customerName: string;
  dongHo: string;
  complex: string;
  phone: string;
  dDay: string;

  loanAmount: number;
  additionalLoan: number;
  executionDate: string;
  remark: string;

  bankBranch: string;
  bankContact: string;
  bankPhone: string;
  bankFax: string;

  supportCenterPhone: string;
  supportCenterFax: string;
  balanceInquiryPhone: string;
  balanceInquiryFax: string;

  middlePrincipal: number;
  middleInterest: number;
  middleBank: string;
  middleAccount: string;
  middleInterestBank: string;
  middleInterestAccount: string;

  balancePrincipal: number;
  balanceInterest: number;
  balanceBank: string;
  balanceAccount: string;

  balcony: number;
  balconyBank: string;
  balconyAccount: string;

  options: number;
  optionsBank: string;
  optionsAccount: string;

  guaranteeFee: number;
  guaranteeFeeBank: string;
  guaranteeFeeAccount: string;

  mgmtFee: number;
  mgmtFeeBank: string;
  mgmtFeeAccount: string;

  movingAllowance: number;
  movingAllowanceBank: string;
  movingAllowanceAccount: string;

  stampDuty: number;
  stampDutyBank: string;
  stampDutyAccount: string;

  stampDutyAdditional: number;
  stampDutyAdditionalBank: string;
  stampDutyAdditionalAccount: string;
}

const EXECUTION_FIXTURES: Record<string, ExecutionData> = {
  "cho-eunhee": {
    id: "cho-eunhee",
    customerName: "조은희",
    dongHo: "102-1001",
    complex: "봄여름가을겨울3차",
    phone: "010-2200-4771",
    dDay: "D-day",
    loanAmount: 260000000,
    additionalLoan: 0,
    executionDate: "2026-04-23",
    remark: "당일 12시 이전에 입금 예정",
    bankBranch: "부전동",
    bankContact: "조연진 대리",
    bankPhone: "051-811-5131",
    bankFax: "051-809-5524",
    supportCenterPhone: "051-891-1235",
    supportCenterFax: "",
    balanceInquiryPhone: "051-256-3745",
    balanceInquiryFax: "051-256-3766",
    middlePrincipal: 133620489,
    middleInterest: 165601,
    middleBank: "국민은행",
    middleAccount: "수표상환",
    middleInterestBank: "",
    middleInterestAccount: "",
    balancePrincipal: 249204633,
    balanceInterest: 0,
    balanceBank: "국민은행",
    balanceAccount: "101437-04-002570",
    balcony: 9000000,
    balconyBank: "국민은행",
    balconyAccount: "101437-04-002570",
    options: 0,
    optionsBank: "",
    optionsAccount: "",
    guaranteeFee: 0,
    guaranteeFeeBank: "",
    guaranteeFeeAccount: "",
    mgmtFee: 350000,
    mgmtFeeBank: "농협",
    mgmtFeeAccount: "356-1102-3344-55 (관리사무소)",
    movingAllowance: 0,
    movingAllowanceBank: "",
    movingAllowanceAccount: "",
    stampDuty: 75000,
    stampDutyBank: "현금/수입인지",
    stampDutyAccount: "—",
    stampDutyAdditional: 0,
    stampDutyAdditionalBank: "",
    stampDutyAdditionalAccount: "",
  },
  // 잠실 미성크로바 시드 단지 데이터와 정확히 일치 (자동 채움 시연용).
  "han-oyoung": {
    id: "han-oyoung",
    customerName: "한오영",
    dongHo: "101-603",
    complex: "잠실 미성크로바",
    phone: "010-4422-1502",
    dDay: "D-1",
    loanAmount: 280000000,
    additionalLoan: 0,
    executionDate: "2026-04-24",
    remark: "오전 자서 후 즉시 실행",
    bankBranch: "잠실지점",
    bankContact: "이지영 과장",
    bankPhone: "02-2143-7700",
    bankFax: "02-2143-7701",
    supportCenterPhone: "02-6956-6338",
    supportCenterFax: "02-6956-6339",
    balanceInquiryPhone: "02-2026-1100",
    balanceInquiryFax: "02-2026-1101",
    middlePrincipal: 181607584,
    middleInterest: 638216,
    middleBank: "국민은행",
    middleAccount: "수표상환",
    middleInterestBank: "",
    middleInterestAccount: "",
    balancePrincipal: 117822416,
    balanceInterest: 0,
    balanceBank: "국민",
    balanceAccount: "공급계약서 1조 ⓒ항 가상계좌",
    balcony: 7000000,
    balconyBank: "국민",
    balconyAccount: "공급계약서 1조 ⓒ항 가상계좌",
    options: 3500000,
    optionsBank: "국민",
    optionsAccount: "465101-01-311967",
    guaranteeFee: 0,
    guaranteeFeeBank: "",
    guaranteeFeeAccount: "",
    mgmtFee: 453000,
    mgmtFeeBank: "KB 국민은행",
    mgmtFeeAccount: "064601-04-131949",
    movingAllowance: 0,
    movingAllowanceBank: "",
    movingAllowanceAccount: "",
    stampDuty: 75000,
    stampDutyBank: "현금/수입인지",
    stampDutyAccount: "—",
    stampDutyAdditional: 0,
    stampDutyAdditionalBank: "",
    stampDutyAdditionalAccount: "",
  },
  // 포항학산더휴 시드 단지 데이터와 정확히 일치 (자동 채움 시연용).
  "lee-bokhee": {
    id: "lee-bokhee",
    customerName: "이복희",
    dongHo: "201-801",
    complex: "포항학산더휴",
    phone: "010-8581-5308",
    dDay: "D-2",
    loanAmount: 223000000,
    additionalLoan: 0,
    executionDate: "2026-04-25",
    remark: "11시 실행 — 잔금 송금 확인 후 진행",
    bankBranch: "포항북구지점",
    bankContact: "강동훈 대리",
    bankPhone: "054-275-3300",
    bankFax: "054-275-3301",
    supportCenterPhone: "054-275-3300",
    supportCenterFax: "054-275-3301",
    balanceInquiryPhone: "054-275-3302",
    balanceInquiryFax: "054-275-3303",
    middlePrincipal: 172888044,
    middleInterest: 616634,
    middleBank: "국민은행",
    middleAccount: "101437-04-002596",
    middleInterestBank: "",
    middleInterestAccount: "",
    balancePrincipal: 114661956,
    balanceInterest: 0,
    balanceBank: "포항학산더휴 시행사",
    balanceAccount: "공급계약서 1조 ⓒ항 가상계좌",
    balcony: 7000000,
    balconyBank: "포항학산더휴 시행사",
    balconyAccount: "공급계약서 1조 ⓒ항 가상계좌",
    options: 0,
    optionsBank: "신한은행",
    optionsAccount: "110-456-789012",
    guaranteeFee: 0,
    guaranteeFeeBank: "",
    guaranteeFeeAccount: "",
    mgmtFee: 280000,
    mgmtFeeBank: "KB국민은행",
    mgmtFeeAccount: "064-12-345678",
    movingAllowance: 0,
    movingAllowanceBank: "",
    movingAllowanceAccount: "",
    stampDuty: 75000,
    stampDutyBank: "현금/수입인지",
    stampDutyAccount: "—",
    stampDutyAdditional: 0,
    stampDutyAdditionalBank: "",
    stampDutyAdditionalAccount: "",
  },
};

export function getExecutionFixture(id: string, seed?: FixtureSeed): ExecutionData {
  const base = EXECUTION_FIXTURES[id] ?? EXECUTION_FIXTURES["cho-eunhee"];
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
