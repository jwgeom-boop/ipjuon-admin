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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, LogOut, RefreshCw, Download, KeyRound, Search, FileText, CalendarDays, Printer, Inbox, MessageSquare, ClipboardCheck, Mail, CheckCircle2, XCircle, Phone, ArrowRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

type Consultation = Record<string, any>;

const formatMoney = (v?: number | null) =>
  v ? (v / 10000).toLocaleString("ko-KR") + "만원" : "-";

const parseAmount = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;

// v3 9단계 파이프라인 (상담→가심사→결과안내→자서예약→자서→대출실행 + 신청/완료/취소)
const STAGES = [
  { key: "apply",                label: "신청",     short: "신청", icon: Inbox,          color: "blue",    next: "consulting",         nextLabel: "상담시작" },
  { key: "consulting",           label: "상담",     short: "상담", icon: MessageSquare,  color: "indigo",  next: "reviewing",          nextLabel: "심사접수" },
  { key: "reviewing",            label: "가심사",   short: "가심", icon: ClipboardCheck, color: "purple",  next: "result",             nextLabel: "결과입력" },
  { key: "result",               label: "결과안내", short: "결과", icon: Mail,           color: "pink",    next: "signing_reservation",nextLabel: "자서예약" },
  { key: "signing_reservation",  label: "자서예약", short: "예약", icon: CalendarDays,   color: "cyan",    next: "signing",            nextLabel: "자서진행" },
  { key: "signing",              label: "자서",     short: "자서", icon: FileText,       color: "teal",    next: "executing",          nextLabel: "실행일지정" },
  { key: "executing",            label: "대출실행", short: "실행", icon: ArrowRight,     color: "amber",   next: "done",               nextLabel: "실행완료" },
  { key: "done",                 label: "완료",     short: "완료", icon: CheckCircle2,   color: "green",   next: null,                 nextLabel: null },
  { key: "cancel",               label: "취소",     short: "취소", icon: XCircle,        color: "red",     next: null,                 nextLabel: null },
] as const;

type StageKey = typeof STAGES[number]["key"];

// v3 §4.1 단계별 SLA 임계값 (긴급 진입 일수)
const STAGE_WARN_DAYS: Record<string, number> = {
  apply: 1, consulting: 8, reviewing: 5, result: 3, signing_reservation: 7, signing: 4, executing: 1,
};

// 단계별 필수 필드 (spec §3.2)
const BASE_LOAN_FIELDS = [
  "resident_no", "dong", "ho", "apt_type", "transfer_date",
  "division", "product", "loan_period", "deferment", "repayment_method", "ownership",
  "loan_amount",
];
// 서류 체크리스트 — 가심사 필수 4종
const DOCUMENTS: { cat: string; items: { key: string; label: string; required: boolean; stage: string; note?: string }[] }[] = [
  { cat: "가심사 필수", items: [
    { key: "idcard",          label: "신분증",         required: true, stage: "consulting" },
    { key: "income_2yr",      label: "소득자료 2개년", required: true, stage: "consulting", note: "대체: 카드내역, 건강보험내역 등" },
    { key: "consent",         label: "동의서",         required: true, stage: "consulting" },
    { key: "supply_contract", label: "분양계약서",     required: true, stage: "consulting" },
  ]},
];

// 상담 체크리스트 (spec §7) — 5 카테고리 × 19 항목
const CONSULTATION_CHECKS: { cat: string; items: { key: string; label: string }[] }[] = [
  { cat: "상담 필수 확인", items: [
    { key: "purpose",       label: "대출 목적 (실거주/투자)" },
    { key: "income",        label: "연 소득 확인" },
    { key: "existing_loan", label: "기존 대출 여부 (DSR)" },
    { key: "credit_score",  label: "신용점수" },
    { key: "transfer",      label: "전매 여부" },
    { key: "joint_owner",   label: "공동명의 여부" },
  ]},
];

const REQUIRED_BY_STAGE: Record<string, string[]> = {
  apply: [],
  consulting: BASE_LOAN_FIELDS,
  reviewing: [...BASE_LOAN_FIELDS, "document_date"],
  result: [...BASE_LOAN_FIELDS, "document_date", "approved_amount", "approved_rate"],
  signing_reservation: [...BASE_LOAN_FIELDS, "document_date", "approved_amount", "approved_rate", "signing_date", "moving_in_date", "spouse_phone"],
  signing: [...BASE_LOAN_FIELDS, "document_date", "approved_amount", "approved_rate", "signing_date", "execution_date"],
  executing: [...BASE_LOAN_FIELDS, "document_date", "execution_date", "balance_account"],
  done: [],
  cancel: [],
};

const daysSince = (iso?: string) => {
  if (!iso) return null;
  const then = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
};

const statusBadge = (s?: string) => {
  const stage = STAGES.find(st => st.key === s) ?? STAGES[0];
  const cls: Record<string, string> = {
    blue:   "bg-blue-100 text-blue-800",
    indigo: "bg-indigo-100 text-indigo-800",
    purple: "bg-purple-100 text-purple-800",
    pink:   "bg-pink-100 text-pink-800",
    cyan:   "bg-cyan-100 text-cyan-800",
    teal:   "bg-teal-100 text-teal-800",
    amber:  "bg-amber-100 text-amber-800",
    green:  "bg-green-100 text-green-800",
    red:    "bg-red-100 text-red-800",
  };
  return <Badge className={`${cls[stage.color]} border-transparent hover:${cls[stage.color]}`}>{stage.label}</Badge>;
};

// 체류일 표시 (경고 임계 넘으면 빨강)
// 주민번호 마스킹: 포커스 시 전체 노출, 블러 시 뒷자리 가림
const maskSSN = (v?: string) => {
  if (!v) return "";
  const digits = v.replace(/-/g, "");
  if (digits.length < 7) return v;
  return `${digits.slice(0, 6)}-${digits[6]}******`;
};

const MaskedSSNInput = ({ value, onChange, className, placeholder }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string;
}) => {
  const [focused, setFocused] = useState(false);
  const display = focused ? (value ?? "") : maskSSN(value);
  return (
    <Input
      value={display}
      readOnly={!focused}
      onChange={e => {
        const next = e.target.value.replace(/[^0-9-]/g, "").slice(0, 14);
        onChange(next);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder ?? "900101-1******"}
      className={className}
    />
  );
};

const StayDays = ({ stageKey, stageChangedAt }: { stageKey?: string; stageChangedAt?: string }) => {
  const days = daysSince(stageChangedAt);
  if (days === null || !stageKey) return <span className="text-muted-foreground">-</span>;
  const warn = STAGE_WARN_DAYS[stageKey];
  const stuck = warn !== undefined && days >= warn;
  const label = days === 0 ? "오늘" : `${days}일째`;
  return (
    <span className={`text-xs font-medium ${stuck ? "text-red-600" : "text-muted-foreground"}`}>
      {stuck && "⚠ "}{label}
    </span>
  );
};

export default function BankDashboard() {
  const { logout, bankName, loginId } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("list");
  const [data, setData] = useState<Consultation[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
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
      const stage = STAGES.find(s => s.label === statusFilter);
      if (stage) result = result.filter(r => (r.loan_status ?? "apply") === stage.key);
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

  // 단계 전환: 다음 단계로 진행
  const advanceStage = async (id: string, nextKey: string, nextLabel: string) => {
    try {
      await api.updateBankStatus(id, nextKey);
      toast.success(`${nextLabel} 처리`);
      fetchData();
    } catch { toast.error("단계 전환 실패"); }
  };

  // 단계별 건수
  const stageCount = (key: StageKey) => data.filter(r => (r.loan_status ?? "apply") === key).length;

  // 오늘 처리 필요 요약 (상단 알림바)
  const todoSummary = useMemo(() => ({
    apply:     data.filter(r => r.loan_status === "apply").length,
    consulting:data.filter(r => r.loan_status === "consulting" && (daysSince(r.stage_changed_at) ?? 0) >= STAGE_WARN_DAYS.consulting).length,
    reviewing: data.filter(r => r.loan_status === "reviewing" && (daysSince(r.stage_changed_at) ?? 0) >= STAGE_WARN_DAYS.reviewing).length,
    result:    data.filter(r => r.loan_status === "result").length,
    signing_reservation: data.filter(r => r.loan_status === "signing_reservation" && (daysSince(r.stage_changed_at) ?? 0) >= STAGE_WARN_DAYS.signing_reservation).length,
    signing:   data.filter(r => r.loan_status === "signing" && (daysSince(r.stage_changed_at) ?? 0) >= STAGE_WARN_DAYS.signing).length,
    executing: data.filter(r => r.loan_status === "executing" && r.execution_date === format(new Date(), "yyyy-MM-dd")).length,
  }), [data]);

  // 상단 KPI (대시보드 한눈에)
  const kpi = useMemo(() => {
    const now = new Date();
    const weekS = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekE = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthS = format(startOfMonth(now), "yyyy-MM-dd");
    const monthE = format(endOfMonth(now), "yyyy-MM-dd");

    const activeStages = ["apply", "consulting", "reviewing", "result", "signing_reservation", "signing", "executing"];
    const active = data.filter(r => activeStages.includes(r.loan_status ?? "apply")).length;

    const stuck = (activeStages as StageKey[]).reduce((acc, k) => {
      const warn = STAGE_WARN_DAYS[k];
      if (!warn) return acc;
      return acc + data.filter(r => (r.loan_status ?? "apply") === k && (daysSince(r.stage_changed_at) ?? 0) >= warn).length;
    }, 0);

    const weekExec = data.filter(r => r.loan_status === "executing" && r.execution_date && r.execution_date >= weekS && r.execution_date <= weekE).length;

    const monthDone = data.filter(r => r.loan_status === "done" && r.execution_date && r.execution_date >= monthS && r.execution_date <= monthE);
    const monthDoneAmount = monthDone.reduce((sum, r) => sum + (Number(r.loan_amount) || 0), 0);

    const limitPct = summary.total_limit > 0 ? Math.round(((summary.total_amount || 0) / summary.total_limit) * 100) : 0;

    return { active, stuck, weekExec, monthDoneCount: monthDone.length, monthDoneAmount, limitPct };
  }, [data, summary]);

  const openDetail = (row: Consultation) => {
    setSelected(row);
    setForm({ ...row });
    setLastSavedAt(null);
  };

  // 자동 저장 — form 변경 2초 후 (수동 저장 중이면 스킵)
  const dirty = useMemo(() => {
    if (!selected) return false;
    return JSON.stringify(form) !== JSON.stringify(selected);
  }, [form, selected]);

  useEffect(() => {
    if (!dirty || !selected || saving || autoSaving) return;
    const t = setTimeout(async () => {
      try {
        setAutoSaving(true);
        await api.updateBankConsultation(selected.id, form);
        setLastSavedAt(new Date());
        setSelected(prev => prev ? { ...prev, ...form } : prev);
      } catch {
        // 실패 시 조용히 — 다음 변경에서 재시도
      } finally {
        setAutoSaving(false);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [form, dirty, selected, saving, autoSaving]);

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

  // 필수 필드 여부 (현재 단계 기준)
  const curStageKey = (f("loan_status") || "apply") as string;
  const requiredFields = REQUIRED_BY_STAGE[curStageKey] ?? [];
  const isReq = (key: string) => requiredFields.includes(key);
  const isEmpty = (key: string) => {
    const v = form[key];
    return v === undefined || v === null || v === "" || v === 0;
  };
  const reqCls = (key: string) => isReq(key) && isEmpty(key) ? "bg-red-50 border-red-300" : "";
  const ReqMark = ({ k }: { k: string }) => isReq(k) ? <span className="text-red-500 ml-0.5">*</span> : null;

  // 서류 체크
  const docsStr = (f("documents_checked") || "") as string;
  const docsSet = new Set(docsStr.split(",").filter(Boolean));
  const toggleDoc = (key: string) => {
    const s = new Set(docsSet);
    if (s.has(key)) s.delete(key); else s.add(key);
    set("documents_checked", Array.from(s).join(","));
  };
  const allDocs = DOCUMENTS.flatMap(c => c.items);
  const checkedDocCount = allDocs.filter(d => docsSet.has(d.key)).length;
  const stageOrder = ["apply", "consulting", "reviewing", "result", "signing_reservation", "signing", "executing", "done"];
  const curIdx = stageOrder.indexOf(curStageKey);
  const docsMissingRequired = allDocs.filter(d => {
    if (!d.required) return false;
    const dIdx = stageOrder.indexOf(d.stage);
    return dIdx !== -1 && curIdx >= dIdx && !docsSet.has(d.key);
  }).length;

  // 상담 체크리스트 (spec §7)
  const checksStr = (f("consultation_checks") || "") as string;
  const checksSet = new Set(checksStr.split(",").filter(Boolean));
  const toggleCheck = (key: string) => {
    const s = new Set(checksSet);
    if (s.has(key)) s.delete(key); else s.add(key);
    set("consultation_checks", Array.from(s).join(","));
  };
  const allChecks = CONSULTATION_CHECKS.flatMap(c => c.items);
  const checkedConsultCount = allChecks.filter(c => checksSet.has(c.key)).length;

  // 현단계까지 필수 서류만 (좌측 컬럼용)
  const currentStageDocs = DOCUMENTS.flatMap(c => c.items).filter(d => {
    const dIdx = stageOrder.indexOf(d.stage);
    return dIdx !== -1 && curIdx >= dIdx;
  });

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

      <div className="p-6 space-y-4">
        {/* 상단 KPI 스트립 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">진행 중</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{kpi.active}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">신청~실행예정 합계</p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${kpi.stuck > 0 ? "border-l-red-500" : "border-l-gray-300"}`}>
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">정체</p>
              <p className={`text-2xl font-bold mt-0.5 ${kpi.stuck > 0 ? "text-red-600" : "text-gray-900"}`}>{kpi.stuck}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">체류일 초과</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">이번 주 실행예정</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{kpi.weekExec}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">월~일 기준</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">이번 달 실행완료</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{kpi.monthDoneCount}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(kpi.monthDoneAmount)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">한도 소진</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{kpi.limitPct}<span className="text-sm font-normal text-muted-foreground ml-0.5">%</span></p>
              <div className="h-1.5 rounded bg-gray-200 overflow-hidden mt-1.5">
                <div
                  className={`h-full ${kpi.limitPct >= 90 ? "bg-red-500" : kpi.limitPct >= 70 ? "bg-amber-500" : "bg-indigo-500"}`}
                  style={{ width: `${Math.min(100, kpi.limitPct)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상단 "오늘 처리 필요" 알림바 */}
        {(todoSummary.apply + todoSummary.consulting + todoSummary.reviewing + todoSummary.result + todoSummary.signing_reservation + todoSummary.signing + todoSummary.executing) > 0 && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-2 flex flex-wrap items-center gap-3 text-[12px]">
              <span className="font-semibold text-amber-900">🔔 오늘 처리 필요</span>
              {todoSummary.apply > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("신청"); }} className="hover:underline">
                  신규 신청 <strong className="text-blue-700">{todoSummary.apply}</strong>건
                </button>
              )}
              {todoSummary.consulting > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("상담"); }} className="hover:underline">
                  정체 상담 <strong className="text-red-700">{todoSummary.consulting}</strong>건
                </button>
              )}
              {todoSummary.reviewing > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("가심사"); }} className="hover:underline">
                  정체 가심사 <strong className="text-purple-700">{todoSummary.reviewing}</strong>건
                </button>
              )}
              {todoSummary.result > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("결과안내"); }} className="hover:underline">
                  결과통보 <strong className="text-pink-700">{todoSummary.result}</strong>건
                </button>
              )}
              {todoSummary.signing_reservation > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("자서예약"); }} className="hover:underline">
                  자서예약 정체 <strong className="text-cyan-700">{todoSummary.signing_reservation}</strong>건
                </button>
              )}
              {todoSummary.signing > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("자서"); }} className="hover:underline">
                  자서 정체 <strong className="text-teal-700">{todoSummary.signing}</strong>건
                </button>
              )}
              {todoSummary.executing > 0 && (
                <button onClick={() => { setTab("list"); setStatusFilter("대출실행"); }} className="hover:underline">
                  오늘 실행 <strong className="text-amber-700">{todoSummary.executing}</strong>건
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 탭 */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="list">전체 리스트</TabsTrigger>
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

        {tab === "list" && (
          <>
            {/* 단계별 요약 카드 (클릭 시 해당 단계로 필터, v3: 전체 + 9단계 = 10) */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
              <Card
                className={`shadow-sm cursor-pointer transition-colors ${statusFilter === "전체" ? "bg-blue-100 border-blue-400" : "hover:bg-blue-50"}`}
                onClick={() => setStatusFilter("전체")}
              >
                <CardContent className="p-2 text-center">
                  <Inbox className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">전체</p>
                  <p className="text-base font-bold">{data.length}</p>
                </CardContent>
              </Card>
              {STAGES.map(s => {
                const count = stageCount(s.key);
                const Icon = s.icon;
                const active = statusFilter === s.label;
                return (
                  <Card
                    key={s.key}
                    className={`shadow-sm cursor-pointer transition-colors ${active ? "bg-blue-100 border-blue-400" : "hover:bg-blue-50"}`}
                    onClick={() => setStatusFilter(s.label)}
                  >
                    <CardContent className="p-2 text-center">
                      <Icon className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                      <p className="text-base font-bold">{count}</p>
                    </CardContent>
                  </Card>
                );
              })}
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
                <SelectTrigger className="w-32 h-9"><SelectValue placeholder="단계" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  {STAGES.map(s => <SelectItem key={s.key} value={s.label}>{s.label}</SelectItem>)}
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

            {/* v3 §6.2: 단계별 동적 컬럼 + 28px 행 + 11px 폰트 */}
            {(() => {
              const activeStageKey = (STAGES.find(s => s.label === statusFilter)?.key ?? null) as StageKey | null;
              const dHo = (r: Consultation) => r.dong ? `${r.dong}-${r.ho}` : "-";
              const ratePct = (r: Consultation) => r.approved_rate ?? "-";
              const dDay = (iso?: string) => {
                if (!iso) return null;
                const target = new Date(iso); const now = new Date();
                return Math.floor((target.getTime() - now.getTime()) / 86400000);
              };
              const dDayBadge = (iso?: string) => {
                const d = dDay(iso);
                if (d === null) return <span className="text-muted-foreground">-</span>;
                const cls = d < 0 ? "text-red-600 font-semibold" : d <= 3 ? "text-amber-600 font-semibold" : "text-muted-foreground";
                return <span className={`text-[11px] ${cls}`}>{d === 0 ? "D-day" : d > 0 ? `D-${d}` : `D+${-d}`}</span>;
              };
              const ActionBtn = ({ r }: { r: Consultation }) => {
                const cur = STAGES.find(s => s.key === (r.loan_status ?? "apply"));
                // 대출실행: 정산 화면으로 이동 (v3 §10)
                if (cur?.key === "executing") {
                  return (
                    <Button
                      size="sm"
                      className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700"
                      onClick={(e) => { e.stopPropagation(); navigate(`/bank/settlement/${r.id}`); }}
                    >
                      정산 입력 →
                    </Button>
                  );
                }
                if (!cur?.next) return <span className="text-muted-foreground text-[11px]">-</span>;
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={(e) => { e.stopPropagation(); advanceStage(r.id, cur.next!, cur.nextLabel!); }}
                  >
                    {cur.nextLabel} →
                  </Button>
                );
              };

              type Col = { label: string; w?: string; cell: (r: Consultation, i: number) => any };
              const colCheckbox: Col = {
                label: "", w: "w-8",
                cell: (r) => (
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                  </span>
                ),
              };
              const colName: Col = { label: "고객명", cell: (r) => (
                <span className="font-medium">{r.resident_name}{r.memo && <span title={r.memo} className="ml-1 text-amber-500">🔖</span>}</span>
              )};
              const colPhone: Col = { label: "연락처", cell: (r) => r.resident_phone ?? "-" };
              const colDongHo: Col = { label: "동/호", w: "w-20", cell: dHo };
              const colManager: Col = { label: "담당", w: "w-16", cell: (r) => r.manager ?? "-" };
              const colBank: Col = { label: "대출은행", cell: (r) => r.vendor_name ?? "-" };
              const colBankBranch: Col = { label: "은행/담당자", cell: (r) => `${r.vendor_name ?? "-"} ${r.bank_branch ?? ""} ${r.bank_manager_phone ? `(${r.bank_manager_phone})` : ""}`.trim() };
              const colReceiveDate: Col = { label: "접수일", w: "w-24", cell: (r) => r.receive_date ?? "-" };
              const colDocDate: Col = { label: "서류전달일", w: "w-24", cell: (r) => r.document_date ?? "-" };
              const colSigningDate: Col = { label: "자서일", w: "w-28", cell: (r) => r.signing_date ? `${r.signing_date}${r.signing_time ? ` ${r.signing_time}` : ""}` : "-" };
              const colExecDate: Col = { label: "실행일", w: "w-24", cell: (r) => r.execution_date ?? "-" };
              const colMovingDday: Col = { label: "입주 D-day", w: "w-20", cell: (r) => dDayBadge(r.moving_in_date) };
              const colApprovedAmount: Col = { label: "승인금액", cell: (r) => formatMoney(r.approved_amount) };
              const colApprovedRate: Col = { label: "금리", w: "w-16", cell: ratePct };
              const colNotified: Col = { label: "통보", w: "w-16", cell: (r) => r.approved_notified_at ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">대기</span> };
              const colDocsReady: Col = { label: "지참서류", cell: (r) => {
                const d = (r.documents_checked || "").split(",").filter(Boolean).length;
                return <span className={d >= 4 ? "text-green-600" : "text-amber-600"}>{d}/4</span>;
              }};
              const colRequiredFunds: Col = { label: "필요자금", cell: (r) => {
                const A = (r.settle_middle_principal || 0) + (r.settle_middle_interest || 0) + (r.settle_balance_principal || 0) + (r.settle_balance_interest || 0)
                       + (r.settle_balcony || 0) + (r.settle_options || 0) + (r.settle_guarantee_fee || 0) + (r.settle_mgmt_fee || 0)
                       + (r.settle_moving_allowance || 0) + (r.settle_stamp_duty || 0) + (r.settle_stamp_duty_additional || 0);
                const B = (r.loan_amount || 0) + (r.additional_loan_amount || 0);
                const need = A - B;
                if (A === 0 && B === 0) return <span className="text-muted-foreground">-</span>;
                const cls = need > 0 ? "text-red-600" : need < 0 ? "text-green-600" : "text-muted-foreground";
                return <span className={`font-medium ${cls}`}>{formatMoney(Math.abs(need))}{need > 0 ? " 추가" : need < 0 ? " 환급" : ""}</span>;
              }};
              const colSettleStatus: Col = { label: "정산", w: "w-16", cell: (r) => r.execution_completed ? <span className="text-green-600">완료</span> : <span className="text-amber-600">대기</span> };
              const colCanceledReason: Col = { label: "취소사유", cell: (r) => r.canceled_reason ?? r.special_notes ?? "-" };
              const colAmount: Col = { label: "신청금", cell: (r) => formatMoney(r.loan_amount) };
              const colDivision: Col = { label: "구분", w: "w-14", cell: (r) => r.division ?? "-" };
              const colOwnership: Col = { label: "명의", w: "w-14", cell: (r) => r.ownership ?? "-" };
              const colProduct: Col = { label: "상품", w: "w-14", cell: (r) => r.product ?? "-" };
              const colStatus: Col = { label: "단계", w: "w-20", cell: (r) => statusBadge(r.loan_status) };
              const colStay: Col = { label: "체류", w: "w-16", cell: (r) => <StayDays stageKey={r.loan_status} stageChangedAt={r.stage_changed_at} /> };
              const colAction: Col = { label: "액션", w: "w-24", cell: (r) => <ActionBtn r={r} /> };
              const colNum: Col = { label: "#", w: "w-10", cell: (_r, i) => i + 1 };

              const COL_BY_STAGE: Record<string, Col[]> = {
                apply:               [colCheckbox, colNum, colName, colPhone, colDongHo, colReceiveDate, colStay, colAction],
                consulting:          [colCheckbox, colNum, colName, colPhone, colDongHo, colReceiveDate, colStay, colAction],
                reviewing:           [colCheckbox, colNum, colName, colDongHo, colBankBranch, colDocDate, colStay, colAction],
                result:              [colCheckbox, colNum, colName, colDongHo, colApprovedAmount, colApprovedRate, colNotified, colStay, colAction],
                signing_reservation: [colCheckbox, colNum, colName, colDongHo, colSigningDate, colDocsReady, colStay, colAction],
                signing:             [colCheckbox, colNum, colName, colDongHo, colPhone, colManager, colBank, colExecDate, colMovingDday, colStay, colAction],
                executing:           [colCheckbox, colNum, colName, colDongHo, colExecDate, colRequiredFunds, colSettleStatus, colMovingDday, colAction],
                done:                [colCheckbox, colNum, colName, colDongHo, colExecDate, colAmount, colBank, colManager],
                cancel:              [colCheckbox, colNum, colName, colDongHo, colCanceledReason, colReceiveDate],
              };
              const DEFAULT_COLS: Col[] = [colCheckbox, colNum, colManager, colDivision, colOwnership, colName, colDongHo, colPhone, colReceiveDate, colExecDate, colAmount, colProduct, colStatus, colStay];
              const cols = activeStageKey ? (COL_BY_STAGE[activeStageKey] ?? DEFAULT_COLS) : DEFAULT_COLS;

              return (
                <div className="border rounded-lg bg-white overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        {cols.map((c, idx) => (
                          <TableHead key={idx} className={`text-[10px] uppercase tracking-wide py-1 ${c.w ?? ""}`}>
                            {idx === 0 ? (
                              <Checkbox
                                checked={filtered.length > 0 && filtered.every(r => selectedIds.has(r.id))}
                                onCheckedChange={(ck) => ck ? selectAllVisible() : clearSelection()}
                              />
                            ) : c.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={cols.length} className="text-center py-10 text-muted-foreground">로딩 중...</TableCell></TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={cols.length} className="text-center py-10 text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>
                      ) : filtered.slice(0, 50).map((r, i) => (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50 h-7" onClick={() => openDetail(r)}>
                          {cols.map((c, idx) => (
                            <TableCell key={idx} className="text-[11px] py-1">{c.cell(r, i)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filtered.length > 50 && (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground bg-gray-50 border-t">
                      상위 50건 표시 · 전체 {filtered.length}건 (필터/검색으로 좁혀주세요)
                    </div>
                  )}
                </div>
              );
            })()}
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
              <CardHeader><CardTitle className="text-base">파이프라인 단계별 집계</CardTitle></CardHeader>
              <CardContent className="text-sm grid grid-cols-3 md:grid-cols-9 gap-3">
                {STAGES.map(s => (
                  <div key={s.key} className="text-center">
                    <p className="text-muted-foreground text-xs">{s.label}</p>
                    <p className="font-bold text-lg">{stageCount(s.key)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">운영 요약</CardTitle></CardHeader>
              <CardContent className="text-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-muted-foreground text-xs">총 접수(순)</p><p className="font-bold">{summary.total_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">총 접수금액</p><p className="font-bold">{formatMoney(summary.total_amount)}</p></div>
                <div><p className="text-muted-foreground text-xs">오늘 접수</p><p className="font-bold">{summary.today_count ?? 0}건</p></div>
                <div><p className="text-muted-foreground text-xs">오늘 실행예정</p><p className="font-bold">{summary.today_exec_count ?? 0}건</p></div>
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

      {/* 상세 패널 — 3컬럼 한화면 구조 (spec §4) */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { if (lastSavedAt) fetchData(); setSelected(null); } }}>
        <DialogContent className="max-w-[1400px] w-[95vw] h-[92vh] p-0 gap-0 flex flex-col">
          {selected && (() => {
            const curStage = STAGES.find(s => s.key === (f("loan_status") || "apply"));
            const missingCount = requiredFields.filter(isEmpty).length;
            const loanAmount = Number(f("loan_amount")) || 0;
            const deposit = Number(f("customer_deposit")) || 0;
            const netLoan = Math.max(loanAmount - deposit, 0);
            const money = (n: number) => n === 0 ? "-" : `${(n / 10000).toLocaleString("ko-KR")}만원`;

            // 알림 규칙 (간단 버전 — spec §6.3 알림 엔진 축약)
            const alerts: { level: "danger" | "warning" | "info"; msg: string }[] = [];
            if (missingCount > 0) alerts.push({ level: "danger", msg: `필수 항목 ${missingCount}개 미입력` });
            if (docsMissingRequired > 0) alerts.push({ level: "danger", msg: `필수 서류 ${docsMissingRequired}개 미수령` });
            const stayDays = daysSince(selected.stage_changed_at);
            const warnThreshold = STAGE_WARN_DAYS[curStage?.key ?? ""];
            if (stayDays !== null && warnThreshold !== undefined && stayDays >= warnThreshold) {
              alerts.push({ level: "warning", msg: `${curStage?.label} 단계 ${stayDays}일 체류` });
            }
            if (checksSet.has("first_home"))  alerts.push({ level: "info", msg: "생애최초 특례 적용 가능" });
            if (checksSet.has("newlywed"))    alerts.push({ level: "info", msg: "신혼부부 우대금리" });
            if (checksSet.has("multi_child")) alerts.push({ level: "info", msg: "다자녀 우대금리" });
            if (f("ownership") === "공동")    alerts.push({ level: "info", msg: "공동명의 — 전원 자서 필요" });
            if (checksSet.has("transfer"))    alerts.push({ level: "warning", msg: "전매 물건 — 규제지역 확인 필요" });

            const alertBg: Record<string, string> = {
              danger:  "bg-red-50 text-red-700 border-red-200",
              warning: "bg-amber-50 text-amber-700 border-amber-200",
              info:    "bg-blue-50 text-blue-700 border-blue-200",
            };

            return (
              <>
                {/* 헤더 (고정) — 고객 식별 + 단계 진행 표시 */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white">
                  <div className="flex items-center gap-4 min-w-0">
                    <DialogTitle className="text-[15px] font-semibold whitespace-nowrap">{selected.resident_name}</DialogTitle>
                    <a href={`tel:${selected.resident_phone}`} className="text-[13px] text-blue-600 hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                      <Phone className="h-3 w-3" />{selected.resident_phone}
                    </a>
                    {selected.preferred_time && (
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap">희망 {selected.preferred_time}</span>
                    )}
                    <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                      {selected.complex_name && `${selected.complex_name} `}
                      {f("dong") ? `${f("dong")}동 ${f("ho")}호` : ""}
                      {f("apt_type") && ` · ${f("apt_type")}`}
                    </span>
                    <StayDays stageKey={selected.loan_status} stageChangedAt={selected.stage_changed_at} />
                    {missingCount > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[11px] h-5 px-1.5">필수 {missingCount}</Badge>}
                    {docsMissingRequired > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[11px] h-5 px-1.5">서류 {docsMissingRequired}</Badge>}
                  </div>
                  {/* 6단계 진행 표시 */}
                  <div className="flex items-center gap-1">
                    {STAGES.filter(s => s.key !== "cancel").map((s) => {
                      const sIdx = stageOrder.indexOf(s.key);
                      const active = s.key === curStage?.key;
                      const done = sIdx !== -1 && sIdx < curIdx;
                      const color = active ? "bg-primary text-primary-foreground" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => set("loan_status", s.key)}
                          title={s.label}
                          className={`${color} px-2.5 py-1 rounded text-[11px] font-medium transition hover:opacity-80 whitespace-nowrap`}
                        >
                          {s.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3컬럼 본문 */}
                <div className="flex-1 grid grid-cols-[260px_1fr_300px] overflow-hidden">

                  {/* ────── 좌측: 고객 기본 + 입주 물건 + 서류 ────── */}
                  <div className="border-r overflow-y-auto p-3 space-y-4">
                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">고객 기본</p>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">고객명</Label>
                          <p className="text-[13px] font-medium">{selected.resident_name}</p>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">연락처</Label>
                          <p className="text-[13px]">{selected.resident_phone}</p>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">주민번호<ReqMark k="resident_no" /></Label>
                          <MaskedSSNInput value={f("resident_no")} onChange={v => set("resident_no", v)} className={`h-7 text-[12px] mt-1 ${reqCls("resident_no")}`} />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">배우자 연락처<ReqMark k="spouse_phone" /></Label>
                          <Input
                            value={f("spouse_phone")}
                            onChange={e => set("spouse_phone", e.target.value)}
                            placeholder="010-0000-0000"
                            className={`h-7 text-[12px] mt-1 ${reqCls("spouse_phone")}`}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">입주 물건</p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">동<ReqMark k="dong" /></Label>
                            <Input value={f("dong")} onChange={e => set("dong", e.target.value)} className={`h-7 text-[12px] mt-1 ${reqCls("dong")}`} />
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">호수<ReqMark k="ho" /></Label>
                            <Input value={f("ho")} onChange={e => set("ho", e.target.value)} className={`h-7 text-[12px] mt-1 ${reqCls("ho")}`} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">타입<ReqMark k="apt_type" /></Label>
                          <Input value={f("apt_type")} onChange={e => set("apt_type", e.target.value)} placeholder="84A" className={`h-7 text-[12px] mt-1 ${reqCls("apt_type")}`} />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">전매일<ReqMark k="transfer_date" /></Label>
                          <div className="flex gap-1 mt-1">
                            <Input
                              value={f("transfer_date") === "원분양자" ? "" : f("transfer_date")}
                              onChange={e => set("transfer_date", e.target.value)}
                              placeholder="YYYY-MM-DD"
                              disabled={f("transfer_date") === "원분양자"}
                              className={`h-7 text-[12px] flex-1 ${reqCls("transfer_date")}`}
                            />
                            <button
                              type="button"
                              onClick={() => set("transfer_date", f("transfer_date") === "원분양자" ? "" : "원분양자")}
                              className={`h-7 px-2 text-[11px] rounded border whitespace-nowrap transition
                                ${f("transfer_date") === "원분양자"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-white text-muted-foreground border-border hover:bg-gray-50"}`}
                            >
                              원분양자
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">명의<ReqMark k="ownership" /></Label>
                            <Select value={f("ownership")} onValueChange={v => set("ownership", v)}>
                              <SelectTrigger className={`h-7 text-[12px] mt-1 ${reqCls("ownership")}`}><SelectValue placeholder="선택" /></SelectTrigger>
                              <SelectContent>{["단독", "공동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">이사일(입주일)<ReqMark k="moving_in_date" /></Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={`w-full h-7 text-[12px] mt-1 justify-start font-normal ${reqCls("moving_in_date")}`}>
                                  <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground" />
                                  {f("moving_in_date") ? f("moving_in_date") : <span className="text-muted-foreground">선택</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={f("moving_in_date") ? new Date(f("moving_in_date")) : undefined}
                                  onSelect={(date) => set("moving_in_date", date ? format(date, "yyyy-MM-dd") : "")}
                                  locale={ko}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        {f("ownership") === "공동" && (
                          <div className="space-y-1.5 mt-2 p-2 bg-blue-50 rounded">
                            <p className="text-[10px] text-blue-700 font-semibold">공동명의자</p>
                            <Input value={f("joint_owner_name")} onChange={e => set("joint_owner_name", e.target.value)} placeholder="이름" className="h-7 text-[12px]" />
                            <Input value={f("joint_owner_tel")} onChange={e => set("joint_owner_tel", e.target.value)} placeholder="연락처" className="h-7 text-[12px]" />
                            <MaskedSSNInput value={f("joint_owner_rrn")} onChange={v => set("joint_owner_rrn", v)} placeholder="주민번호" className="h-7 text-[12px]" />
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">서류</p>
                        <span className="text-[11px]">
                          <span className={docsMissingRequired > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>{checkedDocCount}</span>
                          <span className="text-muted-foreground">/{allDocs.length}</span>
                          {docsMissingRequired > 0 && <span className="text-red-600 ml-1">· 미수령 {docsMissingRequired}</span>}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {currentStageDocs.map(d => {
                          const checked = docsSet.has(d.key);
                          const missingHere = d.required && !checked;
                          return (
                            <label
                              key={d.key}
                              className={`flex items-start gap-2 px-2 py-1.5 rounded border cursor-pointer transition
                                ${checked ? "bg-green-50 border-green-200" :
                                  missingHere ? "bg-red-50 border-red-200" :
                                  "bg-white border-border hover:bg-gray-50"}`}
                            >
                              <Checkbox checked={checked} onCheckedChange={() => toggleDoc(d.key)} className="mt-0.5 h-4 w-4" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className={`text-[12px] ${checked ? "line-through text-muted-foreground" : "font-medium text-gray-800"}`}>{d.label}</span>
                                  {d.required && (
                                    <span className={`text-[9px] px-1 py-0 rounded border ${checked ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>필수</span>
                                  )}
                                </div>
                                {d.note && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{d.note}</p>}
                              </div>
                            </label>
                          );
                        })}
                        {currentStageDocs.length === 0 && <p className="text-[11px] text-muted-foreground px-2 py-2">해당 단계 서류 없음</p>}
                      </div>
                    </section>
                  </div>

                  {/* ────── 가운데: 고객 현황 + 대출 조건 + 금액 KPI + 일정 + 계좌 ────── */}
                  <div className="overflow-y-auto p-4 space-y-4">

                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">고객 현황 <span className="text-[9px] text-amber-600">(상담 확인)</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">주택보유</Label>
                          <Select value={f("existing_homes")} onValueChange={v => set("existing_homes", v)}>
                            <SelectTrigger className="h-7 text-[12px] mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>
                              {["무주택", "생애최초", "1주택", "2주택", "3주택이상"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">신용점수</Label>
                          <div className="flex gap-1 mt-1">
                            <Select value={f("credit_score_type")} onValueChange={v => set("credit_score_type", v)}>
                              <SelectTrigger className="h-7 text-[12px] w-20 shrink-0"><SelectValue placeholder="CB" /></SelectTrigger>
                              <SelectContent>
                                {["KCB", "NICE"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={f("credit_score") ?? ""}
                              onChange={e => set("credit_score", e.target.value === "" ? null : Number(e.target.value))}
                              placeholder="점수"
                              className="h-7 text-[12px] flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">기 신용대출 (원)</Label>
                          <Input
                            value={f("existing_credit_loan") ? Number(f("existing_credit_loan")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("existing_credit_loan", parseAmount(e.target.value))}
                            placeholder="0"
                            className="h-7 text-[12px] mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">기 담보대출 (원)</Label>
                          <Input
                            value={f("existing_collateral_loan") ? Number(f("existing_collateral_loan")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("existing_collateral_loan", parseAmount(e.target.value))}
                            placeholder="0"
                            className="h-7 text-[12px] mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">분양가 (원)</Label>
                          <Input
                            value={f("sale_price_amount") ? Number(f("sale_price_amount")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("sale_price_amount", parseAmount(e.target.value))}
                            placeholder="예: 500,000,000"
                            className="h-7 text-[12px] mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">LTV <span className="text-[9px] text-muted-foreground">(자동계산)</span></Label>
                          {(() => {
                            const LTV_MAX: Record<string, number> = { "무주택": 70, "생애최초": 80, "1주택": 50, "2주택": 30, "3주택이상": 0 };
                            const sp = Number(f("sale_price_amount")) || 0;
                            const maxLtv = LTV_MAX[f("existing_homes")] ?? null;
                            const maxLoan = sp > 0 && maxLtv !== null ? Math.floor(sp * maxLtv / 100) : null;
                            if (sp === 0 || maxLtv === null) {
                              return <div className="h-7 mt-1 flex items-center text-[11px] text-muted-foreground">분양가·주택보유 입력 필요</div>;
                            }
                            return (
                              <div className="mt-1 px-2 h-7 flex items-center justify-between rounded border text-[12px] bg-green-50 border-green-200 text-green-700">
                                <span className="text-[10px]">최대 대출 ({maxLtv}%)</span>
                                <span className="font-semibold">{maxLoan!.toLocaleString("ko-KR")}원</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">대출 조건</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">구분<ReqMark k="division" /></Label>
                          <Select value={f("division")} onValueChange={v => set("division", v)}>
                            <SelectTrigger className={`h-7 text-[12px] mt-1 ${reqCls("division")}`}><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>{["조합", "일반"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">상품<ReqMark k="product" /></Label>
                          <Select value={f("product")} onValueChange={v => set("product", v)}>
                            <SelectTrigger className={`h-7 text-[12px] mt-1 ${reqCls("product")}`}><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>{["고정", "변동"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">상환방식<ReqMark k="repayment_method" /></Label>
                          <Select value={f("repayment_method")} onValueChange={v => set("repayment_method", v)}>
                            <SelectTrigger className={`h-7 text-[12px] mt-1 ${reqCls("repayment_method")}`}><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>{["원리금", "원금"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">기간 (년)<ReqMark k="loan_period" /></Label>
                          <Input value={f("loan_period")} onChange={e => set("loan_period", e.target.value)} placeholder="30" className={`h-7 text-[12px] mt-1 ${reqCls("loan_period")}`} />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">거치<ReqMark k="deferment" /></Label>
                          <Select value={f("deferment")} onValueChange={v => set("deferment", v)}>
                            <SelectTrigger className={`h-7 text-[12px] mt-1 ${reqCls("deferment")}`}><SelectValue placeholder="선택" /></SelectTrigger>
                            <SelectContent>{["1년", "거치없음"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">담당</Label>
                          <Input value={f("manager")} onChange={e => set("manager", e.target.value)} className="h-7 text-[12px] mt-1" />
                        </div>
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">금액</p>
                      {/* KPI 카드 */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-md border bg-white p-2">
                          <p className="text-[10px] text-muted-foreground">대출신청금</p>
                          <p className="text-[14px] font-semibold mt-0.5">{money(loanAmount)}</p>
                        </div>
                        <div className="rounded-md border bg-white p-2">
                          <p className="text-[10px] text-muted-foreground">고객준비금</p>
                          <p className="text-[14px] font-semibold mt-0.5">{money(deposit)}</p>
                        </div>
                        <div className="rounded-md border-2 border-primary bg-primary/5 p-2">
                          <p className="text-[10px] text-primary font-semibold">실대출 (신청-준비)</p>
                          <p className="text-[14px] font-bold text-primary mt-0.5">{money(netLoan)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">대출신청금 (원)<ReqMark k="loan_amount" /></Label>
                          <Input
                            value={f("loan_amount") ? Number(f("loan_amount")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("loan_amount", parseAmount(e.target.value))}
                            placeholder="350,000,000"
                            className={`h-7 text-[12px] mt-1 ${reqCls("loan_amount")}`}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">고객준비금 (원)<ReqMark k="customer_deposit" /></Label>
                          <Input
                            value={f("customer_deposit") ? Number(f("customer_deposit")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("customer_deposit", parseAmount(e.target.value))}
                            placeholder="10,000,000"
                            className={`h-7 text-[12px] mt-1 ${reqCls("customer_deposit")}`}
                          />
                        </div>
                      </div>
                      {/* v3: 가심사 결과 입력 (결과안내 단계 이후) */}
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">승인금액 (원)<ReqMark k="approved_amount" /></Label>
                          <Input
                            value={f("approved_amount") ? Number(f("approved_amount")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("approved_amount", parseAmount(e.target.value))}
                            placeholder="350,000,000"
                            className={`h-7 text-[12px] mt-1 ${reqCls("approved_amount")}`}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">금리 (%)<ReqMark k="approved_rate" /></Label>
                          <Input
                            value={f("approved_rate")}
                            onChange={e => set("approved_rate", e.target.value)}
                            placeholder="4.25"
                            className={`h-7 text-[12px] mt-1 ${reqCls("approved_rate")}`}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">추가대출 (원)</Label>
                          <Input
                            value={f("additional_loan_amount") ? Number(f("additional_loan_amount")).toLocaleString("ko-KR") : ""}
                            onChange={e => set("additional_loan_amount", parseAmount(e.target.value))}
                            placeholder="0"
                            className="h-7 text-[12px] mt-1"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">일정</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "접수일", key: "receive_date" },
                          { label: "서류전달일", key: "document_date" },
                          { label: "자서일", key: "signing_date" },
                          { label: "실행일", key: "execution_date" },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <Label className="text-[11px] text-muted-foreground">{label}<ReqMark k={key} /></Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={`w-full h-7 text-[12px] mt-1 justify-start font-normal ${reqCls(key)}`}>
                                  <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground" />
                                  {f(key) ? f(key) : <span className="text-muted-foreground">선택</span>}
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
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">자서 시간</Label>
                          <Input
                            value={f("signing_time")}
                            onChange={e => set("signing_time", e.target.value)}
                            placeholder="14:00"
                            className="h-7 text-[12px] mt-1"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">대출 은행 담당자</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">지점</Label>
                          <Input value={f("bank_branch")} onChange={e => set("bank_branch", e.target.value)} placeholder="○○지점" className="h-7 text-[12px] mt-1" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">담당자 전화</Label>
                          <Input value={f("bank_manager_phone")} onChange={e => set("bank_manager_phone", e.target.value)} placeholder="02-0000-0000" className="h-7 text-[12px] mt-1" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">담당자 팩스</Label>
                          <Input value={f("bank_manager_fax")} onChange={e => set("bank_manager_fax", e.target.value)} placeholder="02-0000-0000" className="h-7 text-[12px] mt-1" />
                        </div>
                      </div>
                    </section>

                    <section className="pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">계좌 정보</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "후불이자계좌", key: "deferred_interest_account" },
                          { label: "잔금계좌", key: "balance_account" },
                          { label: "옵션계좌", key: "option_account" },
                          { label: "중도금가상계좌(타행)", key: "interim_virtual_account" },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <Label className="text-[11px] text-muted-foreground">{label}<ReqMark k={key} /></Label>
                            <Input value={f(key)} onChange={e => set(key, e.target.value)} className={`h-7 text-[12px] mt-1 ${reqCls(key)}`} />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* ────── 우측: 알림 + 상담 체크리스트 + 메모 ────── */}
                  <div className="border-l overflow-y-auto p-3 space-y-4 bg-gray-50/40">

                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">알림</p>
                      {alerts.length === 0 ? (
                        <p className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded p-2">✓ 이상 없음</p>
                      ) : (
                        <div className="space-y-1.5">
                          {alerts.map((a, i) => (
                            <div key={i} className={`text-[12px] rounded border px-2 py-1.5 ${alertBg[a.level]}`}>
                              {a.level === "danger" && "⚠ "}
                              {a.level === "warning" && "▲ "}
                              {a.level === "info" && "ⓘ "}
                              {a.msg}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">상담 체크리스트</p>
                        <span className="text-[10px] text-muted-foreground">{checkedConsultCount}/{allChecks.length}</span>
                      </div>
                      <div className="space-y-3">
                        {CONSULTATION_CHECKS.map(cat => (
                          <div key={cat.cat}>
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">{cat.cat}</p>
                            <div className="space-y-0.5">
                              {cat.items.map(item => {
                                const checked = checksSet.has(item.key);
                                return (
                                  <label key={item.key} className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-[12px] transition ${checked ? "bg-green-50" : "hover:bg-white"}`}>
                                    <Checkbox checked={checked} onCheckedChange={() => toggleCheck(item.key)} className="h-3.5 w-3.5" />
                                    <span className={checked ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* v3: 결과안내 단계 — 통보/수락 빠른 액션 */}
                    {f("loan_status") === "result" && (
                      <section className="pt-3 border-t">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">결과 통보</p>
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            variant={f("approved_notified_at") ? "outline" : "default"}
                            className="w-full h-7 text-[11px]"
                            onClick={() => set("approved_notified_at", f("approved_notified_at") ? "" : new Date().toISOString())}
                          >
                            {f("approved_notified_at") ? `✓ 통보 완료 (${new Date(f("approved_notified_at")).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })})` : "고객에게 통보"}
                          </Button>
                          <Button
                            size="sm"
                            variant={f("customer_accepted_at") ? "outline" : "default"}
                            className="w-full h-7 text-[11px]"
                            onClick={() => set("customer_accepted_at", f("customer_accepted_at") ? "" : new Date().toISOString())}
                          >
                            {f("customer_accepted_at") ? `✓ 고객 수락 (${new Date(f("customer_accepted_at")).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })})` : "고객 수락 처리"}
                          </Button>
                        </div>
                      </section>
                    )}

                    {/* v3: 취소 단계 — 취소사유 필수 */}
                    {f("loan_status") === "cancel" && (
                      <section className="pt-3 border-t">
                        <Label className="text-[10px] font-semibold uppercase tracking-wide text-red-600">취소사유</Label>
                        <textarea
                          value={f("canceled_reason")}
                          onChange={e => set("canceled_reason", e.target.value)}
                          rows={3}
                          placeholder="취소 사유 (필수)"
                          className="w-full mt-1 border border-red-300 rounded p-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50"
                        />
                      </section>
                    )}

                    <section className="pt-3 border-t">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">메모</Label>
                      <textarea
                        value={f("special_notes")}
                        onChange={e => set("special_notes", e.target.value)}
                        rows={5}
                        placeholder="상담 내용, 불비 사항, 특이사항..."
                        className="w-full mt-1 border rounded p-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </section>
                  </div>
                </div>

                {/* 푸터 (고정) */}
                <div className="border-t px-4 py-2 flex items-center justify-between bg-white text-xs">
                  <div className="flex items-center gap-3">
                    <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setCancelConfirmOpen(true)}>취소처리</Button>
                    <span className="text-muted-foreground">담당: {f("manager") || "-"}</span>
                    <span>
                      {autoSaving ? <span className="text-blue-600">● 저장 중</span> :
                       dirty ? <span className="text-amber-600">● 변경됨 · 2초 후 저장</span> :
                       lastSavedAt ? <span className="text-green-600">✓ 저장됨 {lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { if (lastSavedAt) fetchData(); setSelected(null); }}>닫기</Button>
                    {curStage?.next && (
                      <Button size="sm" className="h-7 text-xs"
                        disabled={missingCount > 0 || autoSaving}
                        title={missingCount > 0 ? `필수 ${missingCount}개 미입력` : ""}
                        onClick={() => set("loan_status", curStage.next!)}>
                        {curStage.nextLabel} <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

        </DialogContent>
      </Dialog>
    </div>
  );
}
