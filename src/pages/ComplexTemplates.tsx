import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

type AptFee = { apt_type: string; mgmt_fee_amount: number | string; display_order?: number };
type SettlementItem = { category: string; bank?: string; account?: string; note?: string; display_order?: number };

interface Template {
  id?: string;
  complex_name: string;
  // 관리비 예치금
  mgmt_fee_bank?: string;
  mgmt_fee_account?: string;
  mgmt_fee_holder?: string;
  mgmt_fee_timing?: string;
  // 관리사무소
  mgmt_office_location?: string;
  mgmt_office_phone?: string;
  mgmt_office_fax?: string;
  mgmt_office_open_date?: string;
  // 납부방법
  payment_methods?: string;
  payment_notes?: string;
  // 일반 분양/옵션 (deprecated - settlement_items 표로 흡수)
  general_balance_note?: string;
  general_balance_holder?: string;
  general_option_bank?: string;
  general_option_account?: string;
  general_option_holder?: string;
  // 조합 (deprecated)
  union_balance_note?: string;
  union_balance_holder?: string;
  union_option_bank?: string;
  union_option_account?: string;
  union_option_holder?: string;
  // 기타
  middle_loan_note?: string;
  sale_price_inquiry_url?: string;
  stamp_duty?: number | string;
  // 메타
  apt_fee_count?: number;
  updated_by?: string;
  updated_by_role?: string;
  updated_by_bank?: string;
  updated_at?: string;
  apt_fees?: AptFee[];
  settlement_items?: SettlementItem[];
}

const DEFAULT_SETTLEMENT_CATEGORIES: SettlementItem[] = [
  { category: "중도금", note: "원금" },
  { category: "중도금이자", note: "실행일확인" },
  { category: "분양잔금", note: "시행사 입금" },
  { category: "발코니 확장", note: "별매품1" },
  { category: "유상옵션", note: "별매품2" },
  { category: "보증수수료", note: "HUG/HF 대납이자" },
  { category: "선수관리비", note: "관리사무소" },
  { category: "이주비", note: "" },
  { category: "인지대", bank: "현금/수입인지", account: "—", note: "수입인지" },
  { category: "인지대 (추가대출)", note: "" },
];

const EMPTY: Template = {
  complex_name: "",
  stamp_duty: 75000,
  apt_fees: [],
  settlement_items: DEFAULT_SETTLEMENT_CATEGORIES.map((s, i) => ({ ...s, display_order: i })),
};

export default function ComplexTemplates() {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [batchTarget, setBatchTarget] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await api.getComplexTemplates();
      setList(data ?? []);
    } catch {
      toast.error("단지 템플릿 조회 실패");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => setEditTarget({ ...EMPTY });

  const openEdit = async (id: string) => {
    try {
      const data = await api.getComplexTemplate(id);
      setEditTarget(data);
    } catch {
      toast.error("불러오기 실패");
    }
  };

  const handleSave = async (form: Template) => {
    if (!form.complex_name?.trim()) {
      toast.error("단지명은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        stamp_duty: form.stamp_duty === "" ? null : Number(form.stamp_duty),
        apt_fees: (form.apt_fees ?? [])
          .filter((f) => f.apt_type && f.mgmt_fee_amount !== "" && f.mgmt_fee_amount != null)
          .map((f, i) => ({
            apt_type: String(f.apt_type).trim(),
            mgmt_fee_amount: Number(f.mgmt_fee_amount),
            display_order: i,
          })),
        settlement_items: (form.settlement_items ?? [])
          .filter((s) => s.category && String(s.category).trim() !== "")
          .map((s, i) => ({
            category: String(s.category).trim(),
            bank: s.bank?.trim() || null,
            account: s.account?.trim() || null,
            note: s.note?.trim() || null,
            display_order: i,
          })),
      };
      if (form.id) await api.updateComplexTemplate(form.id, payload);
      else await api.createComplexTemplate(payload);
      toast.success("저장되었습니다.");
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message ?? "저장 실패");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await api.deleteComplexTemplate(deleteTarget.id);
      toast.success("삭제되었습니다.");
      setDeleteTarget(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message ?? "삭제 실패");
    }
  };

  const handleBatchApply = async () => {
    if (!batchTarget?.id) return;
    try {
      const result = await api.applyComplexTemplateBatch(batchTarget.id, {});
      toast.success(`${result.updated_count}건 / 매칭 ${result.matched_count}건에 일괄 반영`);
      setBatchTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "일괄 적용 실패");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">아파트 관리</h1>
          <p className="text-sm text-muted-foreground">
            단지별 입주안내문 정보(분양/관리비/옵션대금/관리사무소 등) 1회 등록 → 세대 등록 시 자동 채움.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> 새 아파트 추가
        </Button>
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>단지명</TableHead>
              <TableHead className="w-24 text-center">평형 수</TableHead>
              <TableHead>관리비 계좌</TableHead>
              <TableHead className="w-44">마지막 수정</TableHead>
              <TableHead className="w-56 text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">불러오는 중...</TableCell></TableRow>
            )}
            {!loading && list.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">등록된 단지가 없습니다. 우측 상단 [+ 새 아파트 추가]를 눌러 시작하세요.</TableCell></TableRow>
            )}
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.complex_name}</TableCell>
                <TableCell className="text-center">{t.apt_fee_count ?? 0}개</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.mgmt_fee_bank ? `${t.mgmt_fee_bank} ` : ""}{t.mgmt_fee_account ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t.updated_by ? `${t.updated_by_bank ?? ""} ${t.updated_by}` : "—"}
                  <br />
                  {t.updated_at?.slice(0, 16).replace("T", " ")}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => t.id && openEdit(t.id)} className="gap-1">
                    <Pencil className="w-3.5 h-3.5" /> 수정
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setBatchTarget(t)} className="gap-1">
                    <Copy className="w-3.5 h-3.5" /> 일괄 적용
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(t)} className="gap-1 text-red-600 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" /> 삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 편집 모달 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget?.id ? "단지 정보 수정" : "새 아파트 추가"}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <EditForm
              value={editTarget}
              onChange={setEditTarget}
              onSave={handleSave}
              onCancel={() => setEditTarget(null)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>단지 템플릿 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              [{deleteTarget?.complex_name}] 단지 정보를 삭제합니다. 이미 등록된 세대에는 영향 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일괄 적용 확인 */}
      <AlertDialog open={!!batchTarget} onOpenChange={(o) => !o && setBatchTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일괄 적용</AlertDialogTitle>
            <AlertDialogDescription>
              [{batchTarget?.complex_name}] 단지 정보를 진행 중 세대 전체에 일괄 반영합니다.
              완료/취소 세대는 제외됩니다. 평형이 일치하는 세대만 평형별 관리비가 적용됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchApply}>일괄 적용</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===== 편집 폼 =====
function EditForm({
  value, onChange, onSave, onCancel, saving,
}: {
  value: Template;
  onChange: (v: Template) => void;
  onSave: (v: Template) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = (k: keyof Template) => (e: any) => onChange({ ...value, [k]: e.target.value });

  const fees = useMemo(() => value.apt_fees ?? [], [value]);

  const addFee = () => onChange({
    ...value,
    apt_fees: [...fees, { apt_type: "", mgmt_fee_amount: "" }],
  });

  const updateFee = (i: number, k: keyof AptFee, v: any) => {
    const next = [...fees];
    next[i] = { ...next[i], [k]: v };
    onChange({ ...value, apt_fees: next });
  };

  const removeFee = (i: number) => {
    onChange({ ...value, apt_fees: fees.filter((_, idx) => idx !== i) });
  };

  // 정산 항목 표 — 1번 이미지의 [구분/은행/계좌/비고] 4컬럼
  const settlements = useMemo(() => value.settlement_items ?? [], [value]);

  const addSettlement = () => onChange({
    ...value,
    settlement_items: [...settlements, { category: "", bank: "", account: "", note: "" }],
  });

  const updateSettlement = (i: number, k: keyof SettlementItem, v: any) => {
    const next = [...settlements];
    next[i] = { ...next[i], [k]: v };
    onChange({ ...value, settlement_items: next });
  };

  const removeSettlement = (i: number) => {
    onChange({ ...value, settlement_items: settlements.filter((_, idx) => idx !== i) });
  };

  const resetSettlementsToDefault = () => onChange({
    ...value,
    settlement_items: DEFAULT_SETTLEMENT_CATEGORIES.map((s, i) => ({ ...s, display_order: i })),
  });

  return (
    <div className="space-y-6 py-2">
      <Section title="단지 기본">
        <Field label="단지명 *">
          <Input value={value.complex_name} onChange={set("complex_name")} placeholder="예: 잠실 미성크로바" />
        </Field>
      </Section>

      <Section title="1. 관리비 예치금 (단지 공통)">
        <Two>
          <Field label="은행">
            <Input value={value.mgmt_fee_bank ?? ""} onChange={set("mgmt_fee_bank")} placeholder="예: KB 국민은행" />
          </Field>
          <Field label="납부계좌">
            <Input value={value.mgmt_fee_account ?? ""} onChange={set("mgmt_fee_account")} placeholder="예: 064601-04-131949" />
          </Field>
        </Two>
        <Two>
          <Field label="예금주">
            <Input value={value.mgmt_fee_holder ?? ""} onChange={set("mgmt_fee_holder")} placeholder="예: (주)케이티팝스" />
          </Field>
          <Field label="납부시기">
            <Input value={value.mgmt_fee_timing ?? ""} onChange={set("mgmt_fee_timing")} placeholder="예: 입주증 발급 전 (미납 시 키불출 불가)" />
          </Field>
        </Two>
      </Section>

      <Section title="2. 평형별 관리비 예치금" right={
        <Button size="sm" variant="outline" onClick={addFee} type="button" className="gap-1">
          <Plus className="w-3.5 h-3.5" /> 평형 추가
        </Button>
      }>
        {fees.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">평형별 금액이 없습니다. [+ 평형 추가]로 입력하세요. (예: 45 → 307,000)</p>
        )}
        <div className="space-y-2">
          {fees.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={f.apt_type}
                onChange={(e) => updateFee(i, "apt_type", e.target.value)}
                placeholder="평형 (예: 45 / 59A)"
                className="w-32"
              />
              <Input
                value={f.mgmt_fee_amount}
                onChange={(e) => updateFee(i, "mgmt_fee_amount", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="금액"
                className="w-40"
              />
              <span className="text-sm text-muted-foreground">원</span>
              <Button size="sm" variant="ghost" onClick={() => removeFee(i)} type="button" className="text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="3. 관리사무소">
        <Two>
          <Field label="장소">
            <Input value={value.mgmt_office_location ?? ""} onChange={set("mgmt_office_location")} placeholder="예: 단지 내 관리사무소" />
          </Field>
          <Field label="문의 가능 시기">
            <Input value={value.mgmt_office_open_date ?? ""} onChange={set("mgmt_office_open_date")} placeholder="예: 2026년 1월 12일부터" />
          </Field>
        </Two>
        <Two>
          <Field label="전화">
            <Input value={value.mgmt_office_phone ?? ""} onChange={set("mgmt_office_phone")} placeholder="02-6956-6338" />
          </Field>
          <Field label="팩스">
            <Input value={value.mgmt_office_fax ?? ""} onChange={set("mgmt_office_fax")} placeholder="02-6956-6339" />
          </Field>
        </Two>
      </Section>

      <Section title="4. 납부 방법">
        <Field label="납부방법">
          <Textarea rows={2} value={value.payment_methods ?? ""} onChange={set("payment_methods")}
            placeholder="① 무통장입금, 인터넷뱅킹, 모바일뱅킹 (현장 직접수납 불가) ② 동호수 및 성명기재 ③ 1일 이체한도 사전 증액(은행문의)" />
        </Field>
        <Field label="유의사항">
          <Textarea rows={2} value={value.payment_notes ?? ""} onChange={set("payment_notes")}
            placeholder="예시: 101동 101호 홍길동 → 1010101홍길동(동호이름순, 공백제거)" />
        </Field>
      </Section>

      {/* 5. 정산 항목별 계좌 표 — 입주안내문(1번 이미지) 형식
            기존 5/6/7/8 (일반 분양/옵션, 조합, 중도금대출 상환) 섹션을 표로 통합 */}
      <Section title="5. 정산 항목별 계좌 (입주 안내문)" right={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={resetSettlementsToDefault} type="button" className="text-xs gap-1">
            기본 항목 복원
          </Button>
          <Button size="sm" variant="outline" onClick={addSettlement} type="button" className="gap-1">
            <Plus className="w-3.5 h-3.5" /> 항목 추가
          </Button>
        </div>
      }>
        <p className="text-xs text-muted-foreground -mt-1 mb-2">
          입주안내문에 표 형태로 노출되는 정산 항목별 계좌 정보입니다. 비어 있는 항목은 입주민 화면에서 회색 표시됩니다.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-medium px-3 py-2 w-32">구분</th>
                <th className="text-left font-medium px-3 py-2 w-28">해당은행</th>
                <th className="text-left font-medium px-3 py-2">계좌번호</th>
                <th className="text-left font-medium px-3 py-2 w-32">비고</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                    정산 항목이 없습니다. [기본 항목 복원] 또는 [+ 항목 추가]를 눌러 시작하세요.
                  </td>
                </tr>
              )}
              {settlements.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5">
                    <Input
                      value={s.category}
                      onChange={(e) => updateSettlement(i, "category", e.target.value)}
                      placeholder="중도금"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={s.bank ?? ""}
                      onChange={(e) => updateSettlement(i, "bank", e.target.value)}
                      placeholder="국민은행"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={s.account ?? ""}
                      onChange={(e) => updateSettlement(i, "account", e.target.value)}
                      placeholder="101437-04-002570"
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={s.note ?? ""}
                      onChange={(e) => updateSettlement(i, "note", e.target.value)}
                      placeholder="원금"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Button size="sm" variant="ghost" onClick={() => removeSettlement(i)} type="button" className="text-red-600 h-8 w-8 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="9. 분양대금 조회 URL">
        <Field label="URL">
          <Input value={value.sale_price_inquiry_url ?? ""} onChange={set("sale_price_inquiry_url")}
            placeholder="예: https://www.lottecastle.co.kr" />
        </Field>
      </Section>

      <Section title="10. 정책 (입주ON 내부)">
        <Field label="인지대 (원)">
          <Input
            value={value.stamp_duty ?? ""}
            onChange={(e) => onChange({ ...value, stamp_duty: e.target.value.replace(/[^0-9]/g, "") })}
            className="w-40"
          />
        </Field>
      </Section>

      {value.id && value.updated_by && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          마지막 수정: {value.updated_by_bank ?? ""} {value.updated_by} ({value.updated_by_role}) · {value.updated_at?.slice(0, 16).replace("T", " ")}
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} type="button">취소</Button>
        <Button onClick={() => onSave(value)} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
