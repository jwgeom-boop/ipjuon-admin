import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, AlertTriangle, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Consultation = Record<string, any>;

const parseAmount = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;
const fmt = (n: number) => n.toLocaleString("ko-KR");
const fmtMan = (n: number) => n === 0 ? "-" : `${(n / 10000).toLocaleString("ko-KR")}만원`;

// v3 §10.2 정산 항목 정의
type SettleItem = {
  key: string;
  label: string;
  principalKey?: string;     // 원금 필드명
  interestKey?: string;      // 이자 필드명
  accountKey?: string;       // 계좌 필드명
  bankKey?: string;          // 은행 필드명 (선택)
  note?: string;
  fixed?: number;            // 인지대처럼 정액
};

const SETTLE_ITEMS: SettleItem[] = [
  { key: "middle",    label: "중도금",        principalKey: "settle_middle_principal",  interestKey: "settle_middle_interest",  accountKey: "settle_middle_account",  bankKey: "settle_middle_bank", note: "중도금 대출 은행 계좌" },
  { key: "balance",   label: "분양잔금",      principalKey: "settle_balance_principal", interestKey: "settle_balance_interest", accountKey: "settle_balance_account",                                  note: "시행사 계좌" },
  { key: "balcony",   label: "발코니 확장",   principalKey: "settle_balcony",                                                                                                                          note: "시행사 계좌" },
  { key: "options",   label: "유상옵션",      principalKey: "settle_options",                                                                                                                          note: "시행사 계좌" },
  { key: "guarantee", label: "보증수수료",    interestKey: "settle_guarantee_fee",                                                                                                                     note: "대납이자, 시행사 계좌" },
  { key: "mgmt",      label: "선수관리비",    principalKey: "settle_mgmt_fee",                                                  accountKey: "settle_mgmt_account",                                     note: "관리사무소 계좌" },
  { key: "moving",    label: "이주비",        principalKey: "settle_moving_allowance",                                          accountKey: "settle_moving_account",   bankKey: "settle_moving_bank", note: "이주비 은행 계좌" },
  { key: "stamp",     label: "인지대 (대출)", principalKey: "settle_stamp_duty",                                                                                                                       note: "정액" },
  { key: "stampAdd",  label: "인지대 (추가)", principalKey: "settle_stamp_duty_additional",                                                                                                            note: "정액" },
];

export default function BankSettlement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Consultation | null>(null);
  const [form, setForm] = useState<Consultation>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const f = (k: string) => form[k] ?? "";
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setNum = (k: string, raw: string) => set(k, parseAmount(raw));

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const list = await api.getBankConsultations();
        const row = (list ?? []).find((r: Consultation) => r.id === id);
        if (!row) { toast.error("데이터를 찾을 수 없습니다."); navigate("/bank"); return; }
        setData(row); setForm({ ...row });
      } catch { toast.error("조회 실패"); }
      finally { setLoading(false); }
    })();
  }, [id, navigate]);

  // 자동 계산: A (상환 합계) - B (대출 합계) = 필요자금
  const totals = useMemo(() => {
    const middlePrincipal = Number(f("settle_middle_principal")) || 0;
    const middleInterest  = Number(f("settle_middle_interest")) || 0;
    const balancePrincipal= Number(f("settle_balance_principal")) || 0;
    const balanceInterest = Number(f("settle_balance_interest")) || 0;
    const balcony         = Number(f("settle_balcony")) || 0;
    const options         = Number(f("settle_options")) || 0;
    const guarantee       = Number(f("settle_guarantee_fee")) || 0;
    const mgmt            = Number(f("settle_mgmt_fee")) || 0;
    const moving          = Number(f("settle_moving_allowance")) || 0;
    const stamp           = Number(f("settle_stamp_duty")) || 0;
    const stampAdd        = Number(f("settle_stamp_duty_additional")) || 0;

    const middleSum  = middlePrincipal + middleInterest;
    const balanceSum = balancePrincipal + balanceInterest;
    const A = middleSum + balanceSum + balcony + options + guarantee + mgmt + moving + stamp + stampAdd;
    const B = (Number(f("loan_amount")) || 0) + (Number(f("additional_loan_amount")) || 0);
    const need = A - B;

    return { middleSum, balanceSum, A, B, need };
  }, [form]);

  // 정산 항목 입력 완료 카운트
  const inputCount = useMemo(() => {
    return SETTLE_ITEMS.filter(it => {
      const p = it.principalKey ? Number(form[it.principalKey]) || 0 : 0;
      const i = it.interestKey ? Number(form[it.interestKey]) || 0 : 0;
      return p > 0 || i > 0;
    }).length;
  }, [form]);

  // D-day (입주일 기준)
  const movingDDay = useMemo(() => {
    if (!form.moving_in_date) return null;
    const d = new Date(form.moving_in_date);
    const now = new Date();
    return Math.floor((d.getTime() - now.getTime()) / 86400000);
  }, [form.moving_in_date]);

  const ddayLabel = movingDDay === null ? "" :
    movingDDay === 0 ? "입주 D-day" :
    movingDDay > 0 ? `입주 D-${movingDDay}` :
    `입주 D+${-movingDDay}`;

  const urgent = movingDDay !== null && movingDDay <= 1;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.updateBankConsultation(id, form);
      toast.success("저장되었습니다.");
      setData(form);
    } catch { toast.error("저장 실패"); }
    setSaving(false);
  };

  const handleComplete = async () => {
    if (!id) return;
    if (totals.need !== 0 && !confirm(`필요자금이 ${totals.need > 0 ? "양수" : "음수"}입니다 (${fmt(Math.abs(totals.need))}원). 그래도 실행 완료 처리하시겠습니까?`)) return;
    setSaving(true);
    try {
      await api.updateBankConsultation(id, { ...form, execution_completed: true });
      await api.updateBankStatus(id, "done");
      toast.success("실행 완료 처리되었습니다.");
      navigate("/bank");
    } catch { toast.error("처리 실패"); }
    setSaving(false);
  };

  // 입금확인 체크리스트
  const checksStr = (f("execution_checks") || "") as string;
  const checksSet = new Set(checksStr.split(",").filter(Boolean));
  const toggleCheck = (k: string) => {
    const s = new Set(checksSet);
    if (s.has(k)) s.delete(k); else s.add(k);
    set("execution_checks", Array.from(s).join(","));
  };
  const EXECUTION_CHECKS = [
    { key: "loan_linked",     label: "대출 연계 완료" },
    { key: "customer_paid",   label: "고객 추가 입금 확인" },
    { key: "center_notified", label: "입주지원센터 통보" },
    { key: "executed",        label: "기표 완료" },
  ];

  // 메모 로그 (한 줄씩 누적, 타임스탬프)
  const [newMemo, setNewMemo] = useState("");
  const memoLog = (f("memo_log") || "") as string;
  const appendMemo = () => {
    if (!newMemo.trim()) return;
    const stamp = new Date().toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    const next = `[${stamp}] ${newMemo.trim()}\n${memoLog}`;
    set("memo_log", next);
    setNewMemo("");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로딩 중...</div>;
  if (!data) return null;

  const moneyInput = (key: string, placeholder = "0") => (
    <Input
      value={form[key] ? Number(form[key]).toLocaleString("ko-KR") : ""}
      onChange={e => setNum(key, e.target.value)}
      placeholder={placeholder}
      className="h-7 text-[12px] text-right"
    />
  );
  const textInput = (key: string, placeholder = "") => (
    <Input
      value={f(key)}
      onChange={e => set(key, e.target.value)}
      placeholder={placeholder}
      className="h-7 text-[12px]"
    />
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 긴급 배너 */}
      {urgent && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-[12px] flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="font-semibold">{ddayLabel}</span>
          <span>· 자서 후 미실행 · 즉시 처리 필요</span>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate("/bank")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> 목록
          </Button>
          <h1 className="text-[14px] font-semibold">{data.resident_name}</h1>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{data.dong}-{data.ho}</Badge>
          {data.vendor_name && <span className="text-[12px] text-muted-foreground">{data.vendor_name}{data.bank_branch ? ` ${data.bank_branch}` : ""}</span>}
          {data.execution_date && <span className="text-[12px]">실행일 <strong>{data.execution_date}</strong></span>}
          {ddayLabel && (
            <Badge className={`text-[10px] h-5 px-1.5 ${urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"} border-transparent`}>
              {ddayLabel}
            </Badge>
          )}
          <Badge className="bg-amber-100 text-amber-700 border-transparent text-[10px] h-5 px-1.5">대출실행</Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>정산 입력 <strong className="text-foreground">{inputCount}/{SETTLE_ITEMS.length}</strong></span>
        </div>
      </header>

      {/* 3컬럼 본문 */}
      <div className="flex-1 grid grid-cols-[260px_1fr_300px] overflow-hidden">

        {/* 좌측: 계약자 / 대출 / 진행 체크 */}
        <aside className="border-r bg-white overflow-y-auto p-3 space-y-3">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">계약자</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-muted-foreground">고객명</span><span className="font-medium">{data.resident_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">연락처</span><a className="text-blue-600 hover:underline" href={`tel:${data.resident_phone}`}>{data.resident_phone}</a></div>
              {data.spouse_phone && <div className="flex justify-between"><span className="text-muted-foreground">배우자</span><span>{data.spouse_phone}</span></div>}
              {data.moving_in_date && <div className="flex justify-between"><span className="text-muted-foreground">이사일</span><span>{data.moving_in_date}</span></div>}
            </div>
          </section>

          <section className="pt-2.5 border-t">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">대출 은행</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-muted-foreground">은행</span><span className="font-medium">{data.vendor_name}</span></div>
              {data.bank_branch && <div className="flex justify-between"><span className="text-muted-foreground">지점</span><span>{data.bank_branch}</span></div>}
              {data.bank_manager_phone && <div className="flex justify-between"><span className="text-muted-foreground">전화</span><span>{data.bank_manager_phone}</span></div>}
              {data.bank_manager_fax && <div className="flex justify-between"><span className="text-muted-foreground">FAX</span><span>{data.bank_manager_fax}</span></div>}
            </div>
          </section>

          <section className="pt-2.5 border-t">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">대출 금액</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-muted-foreground">대출금</span><span className="font-medium">{fmtMan(Number(data.loan_amount) || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">추가대출</span><span>{fmtMan(Number(data.additional_loan_amount) || 0)}</span></div>
              <div className="flex justify-between border-t pt-1.5"><span className="font-semibold">합계 (B)</span><span className="font-bold text-blue-700">{fmtMan(totals.B)}</span></div>
              {data.approved_rate && <div className="flex justify-between text-[11px] text-muted-foreground"><span>금리</span><span>{data.approved_rate}%</span></div>}
            </div>
          </section>

          <section className="pt-2.5 border-t">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">진행 체크</p>
            <div className="space-y-1">
              {EXECUTION_CHECKS.map(c => {
                const ck = checksSet.has(c.key);
                return (
                  <label key={c.key} className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-[11px] transition ${ck ? "bg-green-50 text-green-700" : "hover:bg-gray-50"}`}>
                    <Checkbox checked={ck} onCheckedChange={() => toggleCheck(c.key)} className="h-3.5 w-3.5" />
                    <span className={ck ? "line-through" : ""}>{c.label}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </aside>

        {/* 가운데: 정산 테이블 */}
        <main className="overflow-y-auto p-3">
          <div className="bg-white border rounded">
            <div className="px-3 py-1.5 bg-gray-50 border-b flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">정산 내역 (v3 §10.2)</p>
              <p className="text-[11px] text-muted-foreground">금액은 원 단위</p>
            </div>
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-1.5 w-32">항목</th>
                  <th className="text-right px-3 py-1.5 w-32">원금</th>
                  <th className="text-right px-3 py-1.5 w-32">이자</th>
                  <th className="text-left px-3 py-1.5">은행/계좌/비고</th>
                </tr>
              </thead>
              <tbody>
                {SETTLE_ITEMS.map((it, idx) => {
                  const middleRow = it.key === "middle";
                  const balanceRow = it.key === "balance";
                  return (
                    <tr key={it.key} className={`border-t ${idx % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                      <td className="px-3 py-1 font-medium">{it.label}</td>
                      <td className="px-3 py-1">
                        {it.principalKey ? moneyInput(it.principalKey) : <span className="block text-right text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-1">
                        {it.interestKey ? moneyInput(it.interestKey) : <span className="block text-right text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-1">
                        <div className="flex gap-1.5 items-center">
                          {it.bankKey && <div className="w-32">{textInput(it.bankKey, "은행")}</div>}
                          {it.accountKey && <div className="flex-1">{textInput(it.accountKey, "계좌번호")}</div>}
                          {!it.accountKey && !it.bankKey && <span className="text-[11px] text-muted-foreground">{it.note ?? ""}</span>}
                          {(it.accountKey || it.bankKey) && it.note && <span className="text-[10px] text-muted-foreground">{it.note}</span>}
                        </div>
                        {(middleRow || balanceRow) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            소계: <span className="font-semibold">{fmt(middleRow ? totals.middleSum : totals.balanceSum)}원</span>
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-blue-50 font-semibold">
                  <td className="px-3 py-2">상환 합계 (A)</td>
                  <td colSpan={2} className="px-3 py-2 text-right text-blue-700 text-[13px]">{fmt(totals.A)}원</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">중도금+분양잔금+발코니+옵션+보증수수료+관리비+이주비+인지대</td>
                </tr>
                <tr className="border-t bg-blue-50/60 font-semibold">
                  <td className="px-3 py-2">대출 합계 (B)</td>
                  <td colSpan={2} className="px-3 py-2 text-right text-blue-700 text-[13px]">{fmt(totals.B)}원</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">대출금 + 추가대출</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </main>

        {/* 우측: 필요자금 KPI + 메모 + 긴급연락처 */}
        <aside className="border-l bg-white overflow-y-auto p-3 space-y-3">

          {/* 필요자금 KPI */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">필요자금 (A − B)</p>
            <div className={`rounded border-2 p-3 text-center
              ${totals.need > 0 ? "border-red-300 bg-red-50" :
                totals.need < 0 ? "border-green-300 bg-green-50" :
                "border-gray-300 bg-gray-50"}`}>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {totals.need > 0 ? "고객 추가 납부" : totals.need < 0 ? "환급 (고객 수령)" : "정산 일치"}
              </p>
              <p className={`text-[22px] font-bold leading-tight
                ${totals.need > 0 ? "text-red-600" :
                  totals.need < 0 ? "text-green-600" :
                  "text-gray-600"}`}>
                {totals.need === 0 ? "0원" : `${fmt(Math.abs(totals.need))}원`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                A {fmt(totals.A)} − B {fmt(totals.B)}
              </p>
            </div>
          </section>

          {/* 실시간 메모 (로그 누적) */}
          <section className="pt-2.5 border-t">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">실시간 메모</p>
            <div className="flex gap-1">
              <Input
                value={newMemo}
                onChange={e => setNewMemo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && appendMemo()}
                placeholder="메모 입력 후 Enter"
                className="h-7 text-[12px] flex-1"
              />
              <Button size="sm" className="h-7 px-2 text-[11px]" onClick={appendMemo}>추가</Button>
            </div>
            <pre className="mt-1.5 text-[10px] bg-gray-50 border rounded p-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans leading-tight">
              {memoLog || <span className="text-muted-foreground">기록 없음</span>}
            </pre>
          </section>

          {/* 긴급 연락처 */}
          <section className="pt-2.5 border-t">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">긴급 연락처</p>
            <div className="space-y-1 text-[11px]">
              {data.bank_manager_phone && (
                <a href={`tel:${data.bank_manager_phone}`} className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-blue-50 text-blue-700">
                  <Phone className="h-3 w-3" /> 대출은행 담당 ({data.bank_manager_phone})
                </a>
              )}
              {data.resident_phone && (
                <a href={`tel:${data.resident_phone}`} className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-blue-50 text-blue-700">
                  <Phone className="h-3 w-3" /> 고객 ({data.resident_phone})
                </a>
              )}
              {data.spouse_phone && (
                <a href={`tel:${data.spouse_phone}`} className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-blue-50 text-blue-700">
                  <Phone className="h-3 w-3" /> 배우자 ({data.spouse_phone})
                </a>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* 푸터 */}
      <footer className="border-t bg-white px-4 py-2 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          담당: {data.manager || "-"} · 정산 입력 {inputCount}/{SETTLE_ITEMS.length}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => navigate("/bank")}>닫기</Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "임시저장"}
          </Button>
          <Button size="sm" className="h-7 text-[11px] bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={saving}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 실행 완료
          </Button>
        </div>
      </footer>
    </div>
  );
}
