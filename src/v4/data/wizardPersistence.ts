import type { ConsultationData } from "../wizard/consultationFixtures";

// 위저드 입력값을 백엔드 ConsultationRequest 페이로드로 변환.
// 빈 값/0 은 페이로드에서 제외 → 백엔드의 null-check 패턴(요청에 들어온 필드만 갱신)과 호환.
export function consultationToBackend(d: ConsultationData): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // 고객 기본
  if (d.customerName) out.resident_name = d.customerName;
  if (d.phone) out.resident_phone = d.phone;
  if (d.residentNumber) out.resident_no = d.residentNumber;
  if (d.spousePhone) out.spouse_phone = d.spousePhone;

  // 입주 물건
  if (d.complex) out.complex_name = d.complex;
  if (d.dong) out.dong = d.dong;
  if (d.ho) out.ho = d.ho;
  if (d.unitType) out.apt_type = d.unitType;
  if (d.ownership) out.ownership = d.ownership;
  if (d.executionDate) out.execution_date = d.executionDate;
  if (d.resaleDate) out.transfer_date = d.resaleDate;

  // 접수
  if (d.intakeDate) out.receive_date = d.intakeDate;
  if (d.receivedBy) out.manager = d.receivedBy;

  // 메모
  if (d.consultationMemo) out.memo = d.consultationMemo;

  // 가심사 정보
  if (d.housingStatus && d.housingStatus !== "선택") out.existing_homes = d.housingStatus;
  if (d.creditBureau) out.credit_score_type = d.creditBureau;
  if (d.creditScore > 0) out.credit_score = d.creditScore;
  if (d.salePrice > 0) out.sale_price_amount = d.salePrice;
  if (d.desiredLoanAmount > 0) out.loan_amount = d.desiredLoanAmount;
  if (d.annualIncome > 0) out.income = String(d.annualIncome);
  if (d.existingCreditLoan > 0) out.existing_credit_loan = d.existingCreditLoan;
  if (d.existingMortgage > 0) out.existing_collateral_loan = d.existingMortgage;
  if (d.otherLoansNote) out.special_notes = d.otherLoansNote;

  // 대출 조건
  if (d.loanPeriodYears > 0) out.loan_period = `${d.loanPeriodYears}년`;
  if (d.gracePeriodYears > 0) out.deferment = `${d.gracePeriodYears}년`;

  // 서류 (받음 상태인 것만 csv 로 저장)
  const receivedDocs = d.requiredDocs
    .filter((doc) => doc.status === "받음")
    .map((doc) => doc.id)
    .join(",");
  if (receivedDocs) out.documents_checked = receivedDocs;

  return out;
}
