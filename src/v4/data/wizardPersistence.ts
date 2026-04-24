import type { ConsultationData } from "../wizard/consultationFixtures";
import type { ReservationData } from "../wizard/reservationFixtures";
import type { SigningData } from "../wizard/signingFixtures";
import type { ExecutionData } from "../wizard/executionFixtures";

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

// 자서예약 단계 → 자서일/시간/장소 확정.
export function reservationToBackend(d: ReservationData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.signingDate) out.signing_date = d.signingDate;
  if (d.signingTime) out.signing_time = d.signingTime;
  // 자서장소: 은행이면 bankBranchLabel, 아니면 customLabel 을 bank_branch 로 기록
  const branch =
    d.location.kind === "bank"
      ? d.bankBranchLabel
      : (d.location.customLabel ?? "").trim();
  if (branch) out.bank_branch = branch;
  return out;
}

// 자서 단계 → 일정/은행 담당자/대출 금액 확정.
export function signingToBackend(d: SigningData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.signingDate) out.signing_date = d.signingDate;
  if (d.signingTime) out.signing_time = d.signingTime;
  if (d.bankBranch) out.bank_branch = d.bankBranch;
  if (d.bankPhone) out.bank_manager_phone = d.bankPhone;
  if (d.loanAmount > 0) out.loan_amount = d.loanAmount;
  if (d.additionalLoan > 0) out.additional_loan_amount = d.additionalLoan;
  if (d.scheduledExecutionDate) out.execution_date = d.scheduledExecutionDate;
  return out;
}

// 대출실행 단계 → 정산 항목 + 실행 완료 플래그.
export function executionToBackend(
  d: ExecutionData,
  opts?: { markCompleted?: boolean },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (d.bankBranch) out.bank_branch = d.bankBranch;
  if (d.bankPhone) out.bank_manager_phone = d.bankPhone;
  if (d.bankFax) out.bank_manager_fax = d.bankFax;
  if (d.executionDate) out.execution_date = d.executionDate;
  if (d.loanAmount > 0) out.loan_amount = d.loanAmount;
  if (d.additionalLoan > 0) out.additional_loan_amount = d.additionalLoan;

  // 중도금
  if (d.middlePrincipal > 0) out.settle_middle_principal = d.middlePrincipal;
  if (d.middleInterest > 0) out.settle_middle_interest = d.middleInterest;
  if (d.middleBank) out.settle_middle_bank = d.middleBank;
  if (d.middleAccount) out.settle_middle_account = d.middleAccount;

  // 분양잔금
  if (d.balancePrincipal > 0) out.settle_balance_principal = d.balancePrincipal;
  if (d.balanceInterest > 0) out.settle_balance_interest = d.balanceInterest;
  if (d.balanceAccount) out.settle_balance_account = d.balanceAccount;

  // 별매품 / 수수료
  if (d.balcony > 0) out.settle_balcony = d.balcony;
  if (d.options > 0) out.settle_options = d.options;
  if (d.guaranteeFee > 0) out.settle_guarantee_fee = d.guaranteeFee;

  // 선수관리비
  if (d.mgmtFee > 0) out.settle_mgmt_fee = d.mgmtFee;
  if (d.mgmtAccount) out.settle_mgmt_account = d.mgmtAccount;

  // 이주비
  if (d.movingAllowance > 0) out.settle_moving_allowance = d.movingAllowance;
  if (d.movingAllowanceBank) out.settle_moving_bank = d.movingAllowanceBank;
  if (d.movingAllowanceAccount) out.settle_moving_account = d.movingAllowanceAccount;

  // 인지대
  if (d.stampDuty > 0) out.settle_stamp_duty = d.stampDuty;
  if (d.stampDutyAdditional > 0) out.settle_stamp_duty_additional = d.stampDutyAdditional;

  if (opts?.markCompleted) out.execution_completed = true;

  return out;
}
