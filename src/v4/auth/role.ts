// TEMPORARY: loginId 파싱으로 팀장/상담사 구분.
// 백엔드가 role="bank_manager" / "bank_consultant"로 분리되면 이 파일 제거하고
// AuthContext의 role을 직접 사용.
// 명명 규칙: 팀장 = `{은행키}`, 상담사 = `{은행키}{NN}` (예: shinhan01)

export type BankRole = "manager" | "consultant";

export interface ParsedBankAccount {
  role: BankRole;
  bankKey: string;
  consultantNo: number | null; // manager면 null
}

export function parseBankLoginId(loginId: string | null | undefined): ParsedBankAccount | null {
  if (!loginId) return null;
  const m = loginId.match(/^([a-z]+)(\d{2})$/);
  if (m) {
    return { role: "consultant", bankKey: m[1], consultantNo: parseInt(m[2], 10) };
  }
  if (/^[a-z]+$/.test(loginId)) {
    return { role: "manager", bankKey: loginId, consultantNo: null };
  }
  return null;
}

// 팀장이 직접 처리하기로 한 고객의 담당자 표시명. 계정 분리 전까지 공용 상수.
export const MANAGER_ASSIGNEE_NAME = "팀장";

// 데모용 상담사 번호 → 담당자 이름 매핑. 백엔드 `customers.assignee_account_id` 연동 시 제거.
const DEMO_ASSIGNEE_BY_NO: Record<number, string> = {
  1: "김주임",
  2: "이대리",
  3: "박과장",
};

export function getDemoAssigneeName(loginId: string | null | undefined): string | null {
  const parsed = parseBankLoginId(loginId);
  if (!parsed || parsed.role !== "consultant" || parsed.consultantNo == null) return null;
  return DEMO_ASSIGNEE_BY_NO[parsed.consultantNo] ?? null;
}
