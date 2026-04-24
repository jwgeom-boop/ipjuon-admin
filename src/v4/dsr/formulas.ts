export function mortgagePayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

export function principalOnlyFirstYearPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const principalPerMonth = principal / months;
  const firstYearInterest = principal * annualRate;
  return principalPerMonth * 12 + firstYearInterest;
}

export function interestOnlyAnnual(principal: number, annualRate: number): number {
  return principal * annualRate;
}
