import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Consultation = Record<string, any>;

const formatMoney = (v?: number | null) =>
  v ? (v / 10000).toLocaleString("ko-KR") + "만원" : "-";

const statusBadge = (s?: string) => {
  if (s === "done") return <Badge className="bg-green-100 text-green-800 border-transparent hover:bg-green-100">실행완료</Badge>;
  if (s === "cancel") return <Badge className="bg-red-100 text-red-800 border-transparent hover:bg-red-100">취소</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-transparent hover:bg-yellow-100">대기</Badge>;
};

export default function BankDashboard() {
  const { logout, bankName } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("list");
  const [data, setData] = useState<Consultation[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // 필터
  const [divFilter, setDivFilter] = useState("전체");
  const [ownFilter, setOwnFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = bankName ? { bank_name: bankName } : {};
      const [list, sum] = await Promise.all([
        api.getBankConsultations(params),
        api.getBankSummary(bankName ?? undefined),
      ]);
      setData(list ?? []);
      setSummary(sum ?? {});
    } catch { toast.error("데이터 로드 실패"); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let result = data;
    if (divFilter !== "전체") result = result.filter(r => r.division === divFilter);
    if (ownFilter !== "전체") result = result.filter(r => r.ownership === ownFilter);
    if (statusFilter !== "전체") {
      const map: Record<string, string> = { "대기": "wait", "실행완료": "done", "취소": "cancel" };
      result = result.filter(r => (r.loan_status ?? "wait") === map[statusFilter]);
    }
    return result;
  }, [data, divFilter, ownFilter, statusFilter]);

  const openDetail = (row: Consultation) => {
    setSelected(row);
    setForm({ ...row });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.updateBankConsultation(selected.id, form);
      toast.success("저장되었습니다.");
      setSelected(null);
      fetchData();
    } catch { toast.error("저장 실패"); }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!selected) return;
    try {
      await api.updateBankStatus(selected.id, "cancel");
      toast.success("취소 처리되었습니다.");
      setSelected(null);
      fetchData();
    } catch { toast.error("처리 실패"); }
  };

  const handleExcel = () => {
    const rows = filtered.map((r, i) => ({
      "순번": i + 1,
      "담당": r.manager ?? "",
      "전매일": r.transfer_date ?? "",
      "구분": r.division ?? "",
      "명의": r.ownership ?? "",
      "고객명": r.resident_name ?? "",
      "동": r.dong ?? "",
      "호수": r.ho ?? "",
      "연락처": r.resident_phone ?? "",
      "접수일": r.receive_date ?? "",
      "서류전달일": r.document_date ?? "",
      "실행일": r.execution_date ?? "",
      "대출신청금": r.loan_amount ?? "",
      "타입": r.apt_type ?? "",
      "상품": r.product ?? "",
      "상환방식": r.repayment_method ?? "",
      "기간": r.loan_period ?? "",
      "거치": r.deferment ?? "",
      "공동명의자": r.joint_owner_name ?? "",
      "고객준비금": r.customer_deposit ?? "",
      "상태": r.loan_status === "done" ? "실행완료" : r.loan_status === "cancel" ? "취소" : "대기",
      "불비/특이사항": r.special_notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "접수리스트");
    XLSX.writeFile(wb, `접수리스트_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const f = (key: string) => form[key] ?? "";
  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-800">입주ON</span>
          <Badge className="bg-blue-100 text-blue-700 border-transparent">은행 상담사</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{bankName} · 창원 힐스테이트 마크로엔</span>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/login"); }}>
            <LogOut className="h-4 w-4 mr-1" /> 로그아웃
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* 탭 */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="list">접수 리스트</TabsTrigger>
            <TabsTrigger value="summary">집계 현황</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "list" && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "총 접수 (순)", value: `${summary.total_count ?? 0}건 / ${formatMoney(summary.total_amount)}` },
                { label: "대기", value: `${summary.wait_count ?? 0}건` },
                { label: "실행완료", value: `${summary.done_count ?? 0}건` },
                { label: "취소", value: `${summary.cancel_count ?? 0}건 / ${formatMoney(summary.cancel_amount)}` },
                { label: "오늘 접수", value: `${summary.today_count ?? 0}건` },
              ].map(c => (
                <Card key={c.label} className="shadow-sm">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-muted-foreground">{c.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-sm font-bold">{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 필터 */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={divFilter} onValueChange={setDivFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="구분" /></SelectTrigger>
                <SelectContent>
                  {["전체", "조합", "일반"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ownFilter} onValueChange={setOwnFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="명의" /></SelectTrigger>
                <SelectContent>
                  {["전체", "단독", "공동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  {["전체", "대기", "실행완료", "취소"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-auto">총 {filtered.length}건</span>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
              </Button>
              <Button variant="outline" size="sm" onClick={handleExcel}>
                <Download className="h-4 w-4 mr-1" /> 엑셀
              </Button>
            </div>

            {/* 테이블 */}
            <div className="border rounded-lg bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">순번</TableHead>
                    <TableHead>담당</TableHead>
                    <TableHead>구분</TableHead>
                    <TableHead>명의</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>동/호</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>접수일</TableHead>
                    <TableHead>실행일</TableHead>
                    <TableHead>대출신청금</TableHead>
                    <TableHead>상품</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-10 text-muted-foreground">로딩 중...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-10 text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>
                  ) : filtered.map((r, i) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(r)}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{r.manager ?? "-"}</TableCell>
                      <TableCell>{r.division ?? "-"}</TableCell>
                      <TableCell>{r.ownership ?? "-"}</TableCell>
                      <TableCell className="font-medium">{r.resident_name}</TableCell>
                      <TableCell>{r.dong ? `${r.dong}동 ${r.ho}호` : "-"}</TableCell>
                      <TableCell>{r.resident_phone}</TableCell>
                      <TableCell>{r.receive_date ?? "-"}</TableCell>
                      <TableCell>{r.execution_date ?? "-"}</TableCell>
                      <TableCell>{formatMoney(r.loan_amount)}</TableCell>
                      <TableCell>{r.product ?? "-"}</TableCell>
                      <TableCell>{statusBadge(r.loan_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {tab === "summary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">전체 집계</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">총 접수</span><span className="font-medium">{summary.total_count ?? 0}건 / {formatMoney(summary.total_amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">취소</span><span className="font-medium">{summary.cancel_count ?? 0}건 / {formatMoney(summary.cancel_amount)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-semibold">순 접수</span><span className="font-bold">{(summary.total_count ?? 0) - (summary.cancel_count ?? 0)}건</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">대기</span><span>{summary.wait_count ?? 0}건</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">실행완료</span><span>{summary.done_count ?? 0}건</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">오늘 접수</span><span>{summary.today_count ?? 0}건</span></div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 상세 패널 */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상담 상세 / 수정</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 text-sm">
              {/* 섹션1: 기본정보 (읽기전용) */}
              <div>
                <p className="font-semibold text-muted-foreground mb-2">기본 정보 (앱 수신)</p>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                  <div><span className="text-muted-foreground">고객명</span><p className="font-medium">{selected.resident_name}</p></div>
                  <div><span className="text-muted-foreground">연락처</span><p className="font-medium">{selected.resident_phone}</p></div>
                  <div><span className="text-muted-foreground">단지명</span><p className="font-medium">{selected.complex_name ?? "-"}</p></div>
                  <div><span className="text-muted-foreground">희망대출</span><p className="font-medium">{selected.desired_loan ?? "-"}</p></div>
                  <div><span className="text-muted-foreground">은행</span><p className="font-medium">{selected.vendor_name}</p></div>
                  <div><span className="text-muted-foreground">신청일시</span><p className="font-medium">{selected.created_at ? new Date(selected.created_at).toLocaleDateString("ko-KR") : "-"}</p></div>
                </div>
              </div>

              {/* 섹션2: 대출 상세 */}
              <div>
                <p className="font-semibold text-muted-foreground mb-2">대출 상세</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "담당", key: "manager" },
                    { label: "전매일", key: "transfer_date" },
                    { label: "동", key: "dong" },
                    { label: "호수", key: "ho" },
                    { label: "타입", key: "apt_type" },
                    { label: "기간", key: "loan_period" },
                    { label: "거치", key: "deferment" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input value={f(key)} onChange={e => set(key, e.target.value)} className="h-8 text-sm mt-1" />
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs text-muted-foreground">구분</Label>
                    <Select value={f("division")} onValueChange={v => set("division", v)}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{["조합", "일반"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">명의</Label>
                    <Select value={f("ownership")} onValueChange={v => set("ownership", v)}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{["단독", "공동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">상품</Label>
                    <Select value={f("product")} onValueChange={v => set("product", v)}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{["고정", "변동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">상환방식</Label>
                    <Select value={f("repayment_method")} onValueChange={v => set("repayment_method", v)}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{["원리금", "원금"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">대출신청금 (원)</Label>
                    <Input type="number" value={f("loan_amount")} onChange={e => set("loan_amount", Number(e.target.value))} className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">고객준비금 (원)</Label>
                    <Input type="number" value={f("customer_deposit")} onChange={e => set("customer_deposit", Number(e.target.value))} className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">접수일</Label>
                    <Input type="date" value={f("receive_date")} onChange={e => set("receive_date", e.target.value)} className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">서류전달일</Label>
                    <Input type="date" value={f("document_date")} onChange={e => set("document_date", e.target.value)} className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">실행일</Label>
                    <Input type="date" value={f("execution_date")} onChange={e => set("execution_date", e.target.value)} className="h-8 text-sm mt-1" />
                  </div>
                </div>
              </div>

              {/* 섹션3: 공동명의자 */}
              <div>
                <p className="font-semibold text-muted-foreground mb-2">공동명의자</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "공동명의자명", key: "joint_owner_name" },
                    { label: "연락처", key: "joint_owner_tel" },
                    { label: "주민등록번호", key: "joint_owner_rrn" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input value={f(key)} onChange={e => set(key, e.target.value)} className="h-8 text-sm mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 섹션4: 계좌 정보 */}
              <div>
                <p className="font-semibold text-muted-foreground mb-2">계좌 정보</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: "후불이자계좌", key: "deferred_interest_account" },
                    { label: "잔금계좌", key: "balance_account" },
                    { label: "옵션계좌", key: "option_account" },
                    { label: "중도금가상계좌(타행)", key: "interim_virtual_account" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input value={f(key)} onChange={e => set(key, e.target.value)} className="h-8 text-sm mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 불비/특이사항 */}
              <div>
                <Label className="text-xs text-muted-foreground">불비 / 특이사항</Label>
                <textarea
                  value={f("special_notes")}
                  onChange={e => set("special_notes", e.target.value)}
                  rows={3}
                  className="w-full mt-1 border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-between border-t pt-4">
                <Button variant="destructive" size="sm" onClick={handleCancel}>취소처리</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>닫기</Button>
                  <Button onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
