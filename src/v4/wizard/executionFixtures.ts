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
  "han-oyoung": {
    id: "han-oyoung",
    customerName: "한오영",
    dongHo: "101-603",
    complex: "봄여름가을겨울3차",
    phone: "010-4422-1502",
    dDay: "D-1",
    loanAmount: 180000000,
    additionalLoan: 0,
    executionDate: "2026-04-24",
    remark: "오전 자서 후 즉시 실행",
    bankBranch: "부전동",
    bankContact: "조연진 대리",
    bankPhone: "051-811-5131",
    bankFax: "051-809-5524",
    supportCenterPhone: "051-891-1235",
    supportCenterFax: "",
    balanceInquiryPhone: "051-256-3745",
    balanceInquiryFax: "051-256-3766",
    middlePrincipal: 181607584,
    middleInterest: 638216,
    middleBank: "국민은행",
    middleAccount: "101437-04-002596",
    middleInterestBank: "",
    middleInterestAccount: "",
    balancePrincipal: 117822416,
    balanceInterest: 0,
    balanceBank: "국민은행",
    balanceAccount: "101437-04-002570",
    balcony: 7000000,
    balconyBank: "국민은행",
    balconyAccount: "101437-04-002570",
    options: 0,
    optionsBank: "",
    optionsAccount: "",
    guaranteeFee: 0,
    guaranteeFeeBank: "",
    guaranteeFeeAccount: "",
    mgmtFee: 270000,
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
  "lee-bokhee": {
    id: "lee-bokhee",
    customerName: "이복희",
    dongHo: "101-801",
    complex: "봄여름가을겨울3차",
    phone: "010-8581-5308",
    dDay: "D-2",
    loanAmount: 223000000,
    additionalLoan: 0,
    executionDate: "2026-04-25",
    remark: "11시 실행 — 잔금 송금 확인 후 진행",
    bankBranch: "부전동",
    bankContact: "조연진 대리",
    bankPhone: "051-811-5131",
    bankFax: "051-809-5524",
    supportCenterPhone: "051-891-1235",
    supportCenterFax: "",
    balanceInquiryPhone: "051-256-3745",
    balanceInquiryFax: "051-256-3766",
    middlePrincipal: 172888044,
    middleInterest: 616634,
    middleBank: "국민은행",
    middleAccount: "101437-04-002596",
    middleInterestBank: "",
    middleInterestAccount: "",
    balancePrincipal: 114661956,
    balanceInterest: 0,
    balanceBank: "국민은행",
    balanceAccount: "101437-04-002570",
    balcony: 7000000,
    balconyBank: "국민은행",
    balconyAccount: "101437-04-002570",
    options: 0,
    optionsBank: "",
    optionsAccount: "",
    guaranteeFee: 0,
    guaranteeFeeBank: "",
    guaranteeFeeAccount: "",
    mgmtFee: 270000,
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
