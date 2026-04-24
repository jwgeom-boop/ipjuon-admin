export const DSR_CONSTANTS = {
  DSR_LIMIT_BANK: 0.4,
  DSR_LIMIT_NBFI: 0.5,

  STRESS_RATE_CAPITAL: 0.03,
  STRESS_RATE_NON_CAPITAL: 0.0075,
  STRESS_RATE_NON_MORTGAGE: 0.015,

  STRESS_RATIO_VARIABLE: 1.0,
  STRESS_RATIO_MIXED_3Y: 1.0,
  STRESS_RATIO_MIXED_5Y: 0.6,

  CREDIT_LOAN_STRESS_THRESHOLD: 100_000_000,

  REGULATED_MATURITY_CREDIT: 5,
  REGULATED_MATURITY_CREDIT_LINE: 5,
  REGULATED_MATURITY_OTHER: 5,

  EXCLUDED_LOAN_TYPES: ["전세대출", "중도금대출", "소액신용대출"] as const,

  LAST_UPDATED: "2026-04-21",
} as const;

export type RateType =
  | "variable"
  | "mixed_3y"
  | "mixed_5y";

export type RepaymentType =
  | "principal_interest"
  | "principal_only"
  | "maturity_only";

export function getStressRatio(rateType: RateType): number {
  switch (rateType) {
    case "variable":
      return DSR_CONSTANTS.STRESS_RATIO_VARIABLE;
    case "mixed_3y":
      return DSR_CONSTANTS.STRESS_RATIO_MIXED_3Y;
    case "mixed_5y":
      return DSR_CONSTANTS.STRESS_RATIO_MIXED_5Y;
  }
}

export const RATE_TYPE_LABEL: Record<RateType, string> = {
  variable: "변동",
  mixed_3y: "혼합 3년",
  mixed_5y: "혼합 5년",
};

export const REPAYMENT_TYPE_LABEL: Record<RepaymentType, string> = {
  principal_interest: "원리금균등",
  principal_only: "원금균등",
  maturity_only: "만기일시",
};
