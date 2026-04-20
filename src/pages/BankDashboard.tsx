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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, LogOut, RefreshCw, Download, KeyRound, Search, FileText, AlertTriangle, CalendarDays, Printer } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

type Consultation = Record<string, any>;

const formatMoney = (v?: number | null) =>
  v ? (v / 10000).toLocaleString("ko-KR") + "만원" : "-";

// 금액 입력 → 콤마 포맷
const formatAmountInput = (v: string) => {
  const num = v.replace(/[^0-9]/g, "");
  return num ? Number(num).toLocaleString("ko-KR") : "";
};
const parseAmount = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;

const statusBadge = (s?: string) => {
  if (s === "done") return <Badge className="bg-green-100 text-green-800 border-transparent hover:bg-green-100">실행완료</Badge>;
  if (s === "cancel") return <Badge className="bg-red-100 text-red-800 border-transparent hover:bg-red-100">취소</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-transparent hover:bg-yellow-100">대기</Badge>;
};

export default function BankDashboard() {
  const { logout, bankName, loginId } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("today");
  const [data, setData] = useState<Consultation[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePw = async () => {
    if (!pwForm.current) { toast.error("현재 비밀번호를 입력해주세요."); return; }
    if (pwForm.next.length < 6) { toast.error("새 비밀번호는 6자 이상이어야 합니다."); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("새 비밀번호가 일치하지 않습니다."); return; }
    if (!loginId) { toast.error("로그인 정보가 없습니다."); return; }
    setPwSaving(true);
    try {
      const res = await api.changePassword(loginId, pwForm.current, pwForm.next);
      if (res.success) {
        toast.success("비밀번호가 변경되었습니다.");
        setPwOpen(false);
        setPwForm({ current: "", next: "", confirm: "" });
      } else {
        toast.error(res.message ?? "비밀번호 변경 실패");
      }
    } catch { toast.error("비밀번호 변경 실패"); }
    setPwSaving(false);
  };

  // 필터 + 검색
  const [divFilter, setDivFilter] = useState("전체");
  const [ownFilter, setOwnFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [search, setSearch] = useState("");
  // 요청서 생성용 선택
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(r =>
        (r.resident_name || "").toLowerCase().includes(s) ||
        (r.resident_phone || "").includes(s) ||
        String(r.dong || "").includes(s) ||
        String(r.ho || "").includes(s)
      );
    }
    return result;
  }, [data, divFilter, ownFilter, statusFilter, search]);

  // 오늘 할 일 필터
  const todayTasks = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
    const todayExec = data.filter(r => r.execution_date === todayStr && r.loan_status !== "cancel");
    const docMissing = data.filter(r => !r.document_date && r.loan_status !== "cancel" && r.receive_date);
    const weekExec = data
      .filter(r => {
        if (!r.execution_date || r.loan_status === "cancel") return false;
        const ed = new Date(r.execution_date);
        return ed >= new Date(new Date().toDateString()) && ed < weekEnd;
      })
      .sort((a, b) => (a.execution_date || "").localeCompare(b.execution_date || ""));
    return { todayExec, docMissing, weekExec };
  }, [data]);

  // 일별 트렌드 데이터 (최근 30일)
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { date: string; receive: number; execute: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = format(d, "yyyy-MM-dd");
      map.set(key, { date: format(d, "M/d"), receive: 0, execute: 0 });
    }
    data.forEach(r => {
      if (r.loan_status === "cancel") return;
      if (r.receive_date && map.has(r.receive_date)) map.get(r.receive_date)!.receive += 1;
      if (r.execution_date && map.has(r.execution_date)) map.get(r.execution_date)!.execute += 1;
    });
    return Array.from(map.values());
  }, [data]);

  // 월별 실행예정 (당월 포함 향후 3개월)
  const monthlyExec = useMemo(() => {
    const result: Array<{ label: string; count: number; amount: number }> = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthRows = data.filter(r => r.execution_date && r.execution_date.startsWith(ym) && r.loan_status !== "cancel");
      result.push({
        label: `${d.getMonth() + 1}월`,
        count: monthRows.length,
        amount: monthRows.reduce((sum, r) => sum + (r.loan_amount || 0), 0),
      });
    }
    return result;
  }, [data]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(filtered.map(r => r.id)));

  const openRequestDoc = (kind: "balance" | "interim") => {
    if (selectedIds.size === 0) { toast.error("고객을 먼저 선택해주세요."); return; }
    const rows = data.filter(r => selectedIds.has(r.id));
    sessionStorage.setItem("bank_request_doc_payload", JSON.stringify({
      bankName: bankName || "",
      complexFullName: summary.complex_full_name || summary.complex_name || "",
      bankManager: summary.bank_manager || "",
      bankPhone: summary.bank_phone || "",
      bankFax: summary.bank_fax || "",
      rows: rows.map(r => ({
        resident_name: r.resident_name,
        resident_no: r.resident_no,
        dong: r.dong,
        ho: r.ho,
        resident_phone: r.resident_phone,
        execution_date: r.execution_date,
        loan_amount: r.loan_amount,
      })),
    }));
    window.open(`/bank/request/${kind}`, "_blank");
  };

  const markDone = async (id: string) => {
    try {
      await api.updateBankStatus(id, "done");
      toast.success("실행완료 처리");
      fetchData();
    } catch { toast.error("처리 실패"); }
  };

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
      setCancelConfirmOpen(false);
      setSelected(null);
      fetchData();
    } catch { toast.error("처리 실패"); }
  };

  const handleExcel = async () => {
    try {
      const query = bankName ? `?bank_name=${encodeURIComponent(bankName)}` : '';
      const res = await fetch(
        `https://banking-coroner-grader.ngrok-free.dev/api/bank/consultations/excel${query}`,
        { headers: { 'ngrok-skip-browser-warning': 'true', Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` } }
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `접수리스트_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('엑셀 다운로드 실패');
    }
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
          <span className="text-sm text-muted-foreground">{bankName} · {summary.complex_full_name || summary.complex_name || ""}</span>
          <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4 mr-1" /> 비밀번호 변경
          </Button>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/login"); }}>
            <LogOut className="h-4 w-4 mr-1" /> 로그아웃
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* 탭 */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="today">
              오늘 할 일
              {(todayTasks.todayExec.length + todayTasks.docMissing.length) > 0 && (
                <Badge className="ml-2 bg-red-500 text-white border-transparent hover:bg-red-500">
                  {todayTasks.todayExec.length + todayTasks.docMissing.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="list">접수 리스트</TabsTrigger>
            <TabsTrigger value="request">
              요청서
              {selectedIds.size > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white border-transparent hover:bg-blue-500">
                  {selectedIds.size}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="report">리포트</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 한도 게이지 (리스트/리포트에서 공통 상단) */}
        {(tab === "list" || tab === "report") && summary.total_limit > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">
                  한도 소진 · 승인번호 {summary.approval_no || "-"}
                </span>
                <span className="text-muted-foreground">
                  {formatMoney(summary.total_amount)} / 총 {Math.round((summary.total_limit || 0) / 100_000_000)}억원 ({Math.round(((summary.total_amount || 0) / (summary.total_limit || 1)) * 100)}%)
                </span>
              </div>
              <div className="h-2 rounded bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${Math.min(100, ((summary.total_amount || 0) / (summary.total_limit || 1)) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "today" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="p-3 pb-1"><CardTitle className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />오늘 실행예정</CardTitle></CardHeader>
                <CardContent className="p-3 pt-0"><p className="text-2xl font-bold text-red-700">{todayTasks.todayExec.length}건</p></CardContent>
              </Card>
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="p-3 pb-1"><CardTitle className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" />서류 미제출</CardTitle></CardHeader>
                <CardContent className="p-3 pt-0"><p className="text-2xl font-bold text-yellow-700">{todayTasks.docMissing.length}건</p></CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="p-3 pb-1"><CardTitle className="text-xs flex items-center gap-1"><CalendarDays className="h-3 w-3" />이번주 실행예정</CardTitle></CardHeader>
                <CardContent className="p-3 pt-0"><p className="text-2xl font-bold text-green-700">{todayTasks.weekExec.length}건</p></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" />오늘 실행예정 ({todayTasks.todayExec.length}건)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>고객명</TableHead><TableHead>동/호</TableHead><TableHead>연락처</TableHead>
                    <TableHead>대출신청금</TableHead><TableHead>상태</TableHead><TableHead>액션</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {todayTasks.todayExec.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">오늘 실행예정 건이 없습니다.</TableCell></TableRow>
                    ) : todayTasks.todayExec.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(r)}>
                        <TableCell className="font-medium">{r.resident_name}</TableCell>
                        <TableCell>{r.dong ? `${r.dong}동 ${r.ho}호` : "-"}</TableCell>
                        <TableCell>{r.resident_phone}</TableCell>
                        <TableCell>{formatMoney(r.loan_amount)}</TableCell>
                        <TableCell>{statusBadge(r.loan_status)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {r.loan_status !== "done" && (
                            <Button size="sm" variant="outline" onClick={() => markDone(r.id)}>실행완료 처리</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-yellow-600" />서류 미제출 ({todayTasks.docMissing.length}건)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>고객명</TableHead><TableHead>동/호</TableHead><TableHead>접수일</TableHead>
                    <TableHead>연락처</TableHead><TableHead>대출신청금</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {todayTasks.docMissing.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">서류 미제출 건이 없습니다.</TableCell></TableRow>
                    ) : todayTasks.docMissing.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(r)}>
                        <TableCell className="font-medium">{r.resident_name}</TableCell>
                        <TableCell>{r.dong ? `${r.dong}동 ${r.ho}호` : "-"}</TableCell>
                        <TableCell>{r.receive_date ?? "-"}</TableCell>
                        <TableCell>{r.resident_phone}</TableCell>
                        <TableCell>{formatMoney(r.loan_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-green-600" />이번주 실행예정 ({todayTasks.weekExec.length}건)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>실행일</TableHead><TableHead>고객명</TableHead><TableHead>동/호</TableHead>
                    <TableHead>연락처</TableHead><TableHead>대출신청금</TableHead><TableHead>상태</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {todayTasks.weekExec.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">이번주 실행예정 건이 없습니다.</TableCell></TableRow>
                    ) : todayTasks.weekExec.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(r)}>
                        <TableCell className="font-mono text-xs">{r.execution_date}</TableCell>
                        <TableCell className="font-medium">{r.resident_name}</TableCell>
                        <TableCell>{r.dong ? `${r.dong}동 ${r.ho}호` : "-"}</TableCell>
                        <TableCell>{r.resident_phone}</TableCell>
                        <TableCell>{formatMoney(r.loan_amount)}</TableCell>
                        <TableCell>{statusBadge(r.loan_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

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

            {/* 빠른 검색 + 필터 */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="고객명 / 동호수 / 전화 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={divFilter} onValueChange={setDivFilter}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="구분" /></SelectTrigger>
                <SelectContent>
                  {["전체", "조합", "일반", "고정", "변동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ownFilter} onValueChange={setOwnFilter}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="명의" /></SelectTrigger>
                <SelectContent>
                  {["전체", "단독", "공동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  {["전체", "대기", "실행완료", "취소"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-auto">
                {selectedIds.size > 0 && <span className="mr-2 text-blue-600 font-medium">선택 {selectedIds.size}건 · </span>}
                총 {filtered.length}건
              </span>
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every(r => selectedIds.has(r.id))}
                        onCheckedChange={(c) => c ? selectAllVisible() : clearSelection()}
                      />
                    </TableHead>
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
                    <TableRow><TableCell colSpan={13} className="text-center py-10 text-muted-foreground">로딩 중...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={13} className="text-center py-10 text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>
                  ) : filtered.map((r, i) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(r)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                      </TableCell>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{r.manager ?? "-"}</TableCell>
                      <TableCell>{r.division ?? "-"}</TableCell>
                      <TableCell>{r.ownership ?? "-"}</TableCell>
                      <TableCell className="font-medium">
                        {r.resident_name}
                        {r.memo && <span title={r.memo} className="ml-1 text-amber-500">🔖</span>}
                      </TableCell>
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

        {tab === "request" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  잔금/중도금 조회 요청서
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  "접수 리스트" 탭에서 고객을 체크박스로 선택한 후, 아래 버튼으로 요청서를 생성하세요.
                  인쇄 화면에서 PDF 저장 또는 인쇄가 가능합니다.
                </p>

                {selectedIds.size === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground bg-gray-50 rounded">
                    선택된 고객이 없습니다. 접수 리스트에서 체크박스로 선택해주세요.
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm font-medium text-blue-800 mb-2">선택된 고객 {selectedIds.size}명</p>
                      <div className="flex flex-wrap gap-1">
                        {data.filter(r => selectedIds.has(r.id)).map(r => (
                          <Badge key={r.id} variant="secondary" className="text-xs">
                            {r.resident_name} ({r.dong}-{r.ho})
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => openRequestDoc("balance")} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Printer className="h-4 w-4 mr-1" /> 잔금조회 요청서 만들기
                      </Button>
                      <Button onClick={() => openRequestDoc("interim")} className="flex-1 bg-orange-600 hover:bg-orange-700">
                        <Printer className="h-4 w-4 mr-1" /> 중도금조회 요청서 만들기
                      </Button>
                      <Button variant="outline" onClick={clearSelection}>선택 해제</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">요청서에 포함되는 정보</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• 은행명: {bankName}</p>
                <p>• 단지: {summary.complex_full_name || "-"}</p>
                <p>• 담당자: {summary.bank_manager || "(은행 계정에 담당자 정보 등록 필요)"}</p>
                <p>• HP: {summary.bank_phone || "-"}</p>
                <p>• FAX: {summary.bank_fax || "-"}</p>
                <p className="pt-1 text-[11px]">잔금/중도금 수기 기입란은 인쇄 후 현장에서 작성하도록 비워둡니다.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "report" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">고정 금리</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-bold">{summary.fixed_count ?? 0}건</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(summary.fixed_amount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">변동 금리</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-bold">{summary.var_count ?? 0}건</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(summary.var_amount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">취소</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">{summary.cancel_count ?? 0}건</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(summary.cancel_amount)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">일별 접수/실행 추이 (최근 30일)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <ReTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="receive" stroke="#3b82f6" name="접수" strokeWidth={2} />
                    <Line type="monotone" dataKey="execute" stroke="#10b981" name="실행" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">월별 실행예정 (당월 포함 향후 3개월)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyExec}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis yAxisId="left" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={(v) => `${(v / 100_000_000).toFixed(0)}억`} />
                    <ReTooltip formatter={(v: any, n: string) => n === "amount" ? formatMoney(v as number) : `${v}건`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="건수" />
                    <Bar yAxisId="right" dataKey="amount" fill="#f59e0b" name="금액(원)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">전체 집계 요약</CardTitle></CardHeader>
              <CardContent className="text-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-muted-foreground text-xs">총 접수(순)</p><p className="font-bold">{summary.total_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">총 접수금액</p><p className="font-bold">{formatMoney(summary.total_amount)}</p></div>
                <div><p className="text-muted-foreground text-xs">대기</p><p className="font-bold">{summary.wait_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">실행완료</p><p className="font-bold">{summary.done_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">오늘 접수</p><p className="font-bold">{summary.today_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">오늘 실행예정</p><p className="font-bold">{summary.today_exec_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">서류 미제출</p><p className="font-bold">{summary.doc_missing_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">이번주 실행</p><p className="font-bold">{summary.week_exec_count ?? 0}건</p></div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={pwOpen} onOpenChange={(o) => { setPwOpen(o); if (!o) setPwForm({ current: "", next: "", confirm: "" }); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>현재 비밀번호를 확인 후 새 비밀번호로 변경합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">현재 비밀번호</Label>
              <Input
                type="password"
                value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                className="h-8 mt-1"
                placeholder="현재 비밀번호 입력"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">새 비밀번호 (6자 이상)</Label>
              <Input
                type="password"
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                className="h-8 mt-1"
                placeholder="새 비밀번호 입력"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">새 비밀번호 확인</Label>
              <Input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                className="h-8 mt-1"
                placeholder="새 비밀번호 재입력"
                onKeyDown={e => e.key === "Enter" && handleChangePw()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPwOpen(false)}>취소</Button>
            <Button onClick={handleChangePw} disabled={pwSaving}>
              {pwSaving ? "변경 중..." : "변경"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 취소처리 확인 팝업 */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>취소 처리하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{selected?.resident_name}</span> 고객의 대출 접수를 취소 처리합니다.<br />
              이 작업은 되돌리기 어렵습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              취소처리 확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    { label: "주민등록번호", key: "resident_no" },
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
                    <Input
                      value={f("loan_amount") ? Number(f("loan_amount")).toLocaleString("ko-KR") : ""}
                      onChange={e => set("loan_amount", parseAmount(e.target.value))}
                      placeholder="예: 350,000,000"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">고객준비금 (원)</Label>
                    <Input
                      value={f("customer_deposit") ? Number(f("customer_deposit")).toLocaleString("ko-KR") : ""}
                      onChange={e => set("customer_deposit", parseAmount(e.target.value))}
                      placeholder="예: 10,000,000"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  {[
                    { label: "접수일", key: "receive_date" },
                    { label: "서류전달일", key: "document_date" },
                    { label: "실행일", key: "execution_date" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-8 text-sm mt-1 justify-start font-normal">
                            <CalendarIcon className="mr-2 h-3 w-3 text-muted-foreground" />
                            {f(key) ? f(key) : <span className="text-muted-foreground">날짜 선택</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={f(key) ? new Date(f(key)) : undefined}
                            onSelect={(date) => set(key, date ? format(date, "yyyy-MM-dd") : "")}
                            locale={ko}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
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
                <Button variant="destructive" size="sm" onClick={() => setCancelConfirmOpen(true)}>취소처리</Button>
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
