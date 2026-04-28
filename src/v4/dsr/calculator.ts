import {
  DSR_CONSTANTS,
  FinancialSector,
  RateType,
  RepaymentType,
  getStressBaseRate,
  getStressRatio,
} from "./constants";
import {
  mortgagePayment,
  principalOnlyFirstYearPayment,
  interestOnlyAnnual,
} from "./formulas";

export type ExistingLoanType =
  | "주택담보대출"
  | "신용대출"
  | "마이너스통장"
  | "전세대출"
  | "자동차할부"
  | "학자금"
  | "카드론"
  | "중도금대출"
  | "소액신용대출";

export interface NewMortgage {
  amount: number;
  years: number;
  rate: number;
  rateType: RateType;
  repaymentType: RepaymentType;
  gracePeriodYears?: number;
}

export type ExistingLoan =
  | {
      id: string;
      type: "주택담보대출";
      balance: number;
      rate: number;
      remainingYears: number;
      rateType?: RateType;
    }
  | {
      id: string;
      type: "신용대출";
      balance: number;
      rate: number;
    }
  | {
      id: string;
      type: "마이너스통장";
      limit: number;
      rate: number;
    }
  | {
      id: string;
      type: "전세대출";
      balance: number;
      rate: number;
    }
  | {
      id: string;
      type: "자동차할부" | "학자금" | "카드론";
      monthlyPayment: number;
      remainingMonths?: number;
    }
  | {
      id: string;
      type: "중도금대출" | "소액신용대출";
      balance: number;
    };

export interface BorrowerProfile {
  income: number;
  spouseIncome?: number;
  property: {
    isCapitalArea: boolean;
    /** 규제지역(투기과열·조정·토허) 여부. 수도권 비규제와 분리. 10.15 대책 핵심 */
    isRegulated: boolean;
  };
  /** 1금융권(DSR 40%) vs 상호금융(DSR 50%). 미지정 시 기본 bank */
  sector?: FinancialSector;
  existingLoans: ExistingLoan[];
  newLoan?: NewMortgage;
}

export interface DSRBreakdownItem {
  id: string;
  label: string;
  annual: number;
  note?: string;
}

export interface DSRResult {
  dsr: number;
  totalAnnual: number;
  income: number;
  breakdown: DSRBreakdownItem[];
  passed: boolean;
  limit: number;
  headroom: number;
  calculatedAt: string;
  regulationSnapshot: string;
  assumptions: string[];
}

function mortgageStressRate(
  rate: number,
  rateType: RateType,
  isCapital: boolean,
  isRegulated: boolean,
): number {
  const base = getStressBaseRate(isCapital, isRegulated);
  return rate + base * getStressRatio(rateType);
}

function newMortgageAnnual(loan: NewMortgage, isCapital: boolean, isRegulated: boolean): number {
  const stressedRate = mortgageStressRate(loan.rate, loan.rateType, isCapital, isRegulated);
  const months = loan.years * 12;

  switch (loan.repaymentType) {
    case "principal_interest":
      return mortgagePayment(loan.amount, stressedRate, months) * 12;
    case "principal_only":
      return principalOnlyFirstYearPayment(loan.amount, stressedRate, months);
    case "maturity_only":
      return mortgagePayment(loan.amount, stressedRate, months) * 12;
  }
}

function existingMortgageAnnual(
  loan: Extract<ExistingLoan, { type: "주택담보대출" }>,
  isCapital: boolean,
  isRegulated: boolean,
): number {
  const rateType = loan.rateType ?? "variable";
  const stressedRate = mortgageStressRate(loan.rate, rateType, isCapital, isRegulated);
  const months = Math.max(1, loan.remainingYears) * 12;
  return mortgagePayment(loan.balance, stressedRate, months) * 12;
}

function creditLoanAnnual(loan: Extract<ExistingLoan, { type: "신용대출" }>): number {
  const stressed = loan.balance > DSR_CONSTANTS.CREDIT_LOAN_STRESS_THRESHOLD;
  const rate = loan.rate + (stressed ? DSR_CONSTANTS.STRESS_RATE_NON_MORTGAGE : 0);
  const months = DSR_CONSTANTS.REGULATED_MATURITY_CREDIT * 12;
  return mortgagePayment(loan.balance, rate, months) * 12;
}

function creditLineAnnual(loan: Extract<ExistingLoan, { type: "마이너스통장" }>): number {
  const principal = loan.limit;
  const stressed = principal > DSR_CONSTANTS.CREDIT_LOAN_STRESS_THRESHOLD;
  const rate = loan.rate + (stressed ? DSR_CONSTANTS.STRESS_RATE_NON_MORTGAGE : 0);
  const months = DSR_CONSTANTS.REGULATED_MATURITY_CREDIT_LINE * 12;
  return mortgagePayment(principal, rate, months) * 12;
}

function jeonseAnnual(loan: Extract<ExistingLoan, { type: "전세대출" }>): number {
  return interestOnlyAnnual(loan.balance, loan.rate);
}

function fixedMonthlyAnnual(
  loan: Extract<ExistingLoan, { type: "자동차할부" | "학자금" | "카드론" }>
): number {
  return loan.monthlyPayment * 12;
}

export function calculateDSR(profile: BorrowerProfile): DSRResult {
  const isCapital = profile.property.isCapitalArea;
  const isRegulated = profile.property.isRegulated;
  const sector: FinancialSector = profile.sector ?? "bank";
  const breakdown: DSRBreakdownItem[] = [];
  const assumptions: string[] = [];

  if (profile.newLoan && profile.newLoan.amount > 0) {
    const annual = newMortgageAnnual(profile.newLoan, isCapital, isRegulated);
    breakdown.push({
      id: "new",
      label: "신규 잔금대출",
      annual,
      note:
        profile.newLoan.repaymentType === "maturity_only"
          ? "만기일시 → 원리금균등 환산"
          : undefined,
    });
    assumptions.push(
      `신규 대출 스트레스 금리: ${(mortgageStressRate(profile.newLoan.rate, profile.newLoan.rateType, isCapital, isRegulated) * 100).toFixed(2)}%`
    );
  }

  for (const loan of profile.existingLoans) {
    if ((DSR_CONSTANTS.EXCLUDED_LOAN_TYPES as readonly string[]).includes(loan.type)) {
      continue;
    }

    let annual = 0;
    let note: string | undefined;

    switch (loan.type) {
      case "주택담보대출":
        annual = existingMortgageAnnual(loan, isCapital, isRegulated);
        break;
      case "신용대출":
        annual = creditLoanAnnual(loan);
        note = "규제상 5년 균등분할 가정";
        break;
      case "마이너스통장":
        annual = creditLineAnnual(loan);
        note = "한도 전액 · 5년 균등분할 가정";
        break;
      case "전세대출":
        annual = jeonseAnnual(loan);
        note = "이자만 반영";
        break;
      case "자동차할부":
      case "학자금":
      case "카드론":
        annual = fixedMonthlyAnnual(loan);
        note = "약정 월상환액 × 12";
        break;
    }

    breakdown.push({
      id: loan.id,
      label: `기존 ${loan.type}`,
      annual,
      note,
    });
  }

  const income = profile.income + (profile.spouseIncome ?? 0);
  const totalAnnual = breakdown.reduce((sum, b) => sum + b.annual, 0);
  const dsr = income > 0 ? totalAnnual / income : 0;
  const limit = sector === "nbfi" ? DSR_CONSTANTS.DSR_LIMIT_NBFI : DSR_CONSTANTS.DSR_LIMIT_BANK;
  const headroom = Math.max(0, income * limit - totalAnnual);

  return {
    dsr,
    totalAnnual,
    income,
    breakdown,
    passed: income > 0 && dsr <= limit,
    limit,
    headroom,
    calculatedAt: new Date().toISOString(),
    regulationSnapshot: DSR_CONSTANTS.LAST_UPDATED,
    assumptions,
  };
}

export function maxLoanUnderDSR(
  profile: Omit<BorrowerProfile, "newLoan"> & { newLoan: Omit<NewMortgage, "amount"> },
  opts: { low?: number; high?: number; precision?: number } = {}
): number {
  const low = opts.low ?? 0;
  const high = opts.high ?? 2_000_000_000;
  const precision = opts.precision ?? 100_000;

  const sectorLimit = (profile.sector ?? "bank") === "nbfi"
    ? DSR_CONSTANTS.DSR_LIMIT_NBFI
    : DSR_CONSTANTS.DSR_LIMIT_BANK;

  let lo = low;
  let hi = high;
  while (hi - lo > precision) {
    const mid = Math.floor((lo + hi) / 2);
    const res = calculateDSR({
      ...profile,
      newLoan: { ...profile.newLoan, amount: mid },
    });
    if (res.dsr <= sectorLimit) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo / precision) * precision;
}
