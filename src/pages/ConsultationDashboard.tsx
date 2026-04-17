import { useEffect, useState, useMemo } from "react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import BankDetailModal from "@/components/BankDetailModal";
import { RefreshCw, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const VENDOR_TYPES = ["은행", "인테리어", "이사", "인터넷·TV", "청소", "가구", "가전"];
const BANK_NAMES = ["신한은행", "하나은행", "KB국민은행", "우리은행", "NH농협은행", "IBK기업은행", "부산은행", "대구은행"];

const EMPTY_FORM = {
  resident_name: "",
  resident_phone: "",
  vendor_type: "",
  vendor_name: "",
  complex_name: "창원 힐스테이트 마크로엔",
  preferred_time: "오전",
  status: "대기중",
};

type ConsultationRequest = {
  id: string;
  resident_name: string;
  resident_phone: string;
  vendor_name: string;
  vendor_type: string;
  complex_name: string;
  preferred_time: string;
  status: string;
  memo: string | null;
  created_at: string;
};

type StatusFilter = "all" | "대기중" | "처리완료";
type DateRange = "all" | "today" | "week" | "month";

const VENDOR_TABS = ["전체", "은행", "인테리어", "이사", "인터넷·TV", "청소", "가구", "가전"];

const VENDOR_TYPE_MAP: Record<string, string> = {
  bank: "은행",
  interior: "인테리어",
  moving: "이사",
  internet: "인터넷·TV",
  "인터넷/TV": "인터넷·TV",
  cleaning: "청소",
  furniture: "가구",
  appliance: "가전",
};
const normalizeVendorType = (type: string) => VENDOR_TYPE_MAP[type] ?? type;

export default function ConsultationDashboard() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [vendorTab, setVendorTab] = useState("전체");
  const [selected, setSelected] = useState<ConsultationRequest | null>(null);
  const [memo, setMemo] = useState("");
  const [updating, setUpdating] = useState(false);
  const [vendorNameFilter, setVendorNameFilter] = useState("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [registering, setRegistering] = useState(false);

  const setReg = (key: string, val: string) => setRegForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    if (!regForm.resident_name.trim()) { toast.error("고객명을 입력해주세요."); return; }
    if (!regForm.resident_phone.trim()) { toast.error("연락처를 입력해주세요."); return; }
    if (!regForm.vendor_type) { toast.error("업체유형을 선택해주세요."); return; }
    if (!regForm.vendor_name.trim()) { toast.error("업체명을 입력해주세요."); return; }
    setRegistering(true);
    try {
      await api.createConsultation(regForm);
      toast.success("상담 신청이 등록되었습니다.");
      setRegisterOpen(false);
      setRegForm(EMPTY_FORM);
      fetchData();
    } catch { toast.error("등록에 실패했습니다."); }
    setRegistering(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getConsultations();
      setRequests(data ?? []);
    } catch (error) {
      toast.error("데이터를 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Count per vendor type (unaffected by filters)
  const vendorCounts = useMemo(() => {
    const counts: Record<string, number> = { "전체": requests.length };
    VENDOR_TABS.forEach((t) => { if (t !== "전체") counts[t] = 0; });
    requests.forEach((r) => { const t = normalizeVendorType(r.vendor_type); if (counts[t] !== undefined) counts[t]++; });
    return counts;
  }, [requests]);

  // Dynamic vendor names for the selected tab
  const vendorNames = useMemo(() => {
    if (vendorTab === "전체") return [];
    const names = new Set<string>();
    requests.forEach((r) => { if (normalizeVendorType(r.vendor_type) === vendorTab) names.add(r.vendor_name); });
    return Array.from(names).sort();
  }, [requests, vendorTab]);

  // Reset vendor name filter when tab changes
  useEffect(() => {
    setVendorNameFilter("all");
  }, [vendorTab]);

  const filtered = useMemo(() => {
    let result = requests;

    if (vendorTab !== "전체") {
      result = result.filter((r) => normalizeVendorType(r.vendor_type) === vendorTab);
    }
    if (vendorNameFilter !== "all") {
      result = result.filter((r) => r.vendor_name === vendorNameFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (dateRange !== "all") {
      const now = new Date();
      let start: Date;
      if (dateRange === "today") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === "week") {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      result = result.filter((r) => new Date(r.created_at) >= start);
    }
    return result;
  }, [requests, vendorTab, vendorNameFilter, statusFilter, dateRange]);

  const handleStatusChange = async () => {
    if (!selected) return;
    setUpdating(true);
    const newStatus = selected.status === "대기중" ? "처리완료" : "대기중";
    try {
      await api.updateConsultation(selected.id, { status: newStatus, memo });
      toast.success("상태가 변경되었습니다.");
      setSelected(null);
      fetchData();
    } catch { toast.error("상태 변경에 실패했습니다."); }
    setUpdating(false);
  };

  const handleSaveMemo = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      await api.updateConsultation(selected.id, { memo });
      toast.success("메모가 저장되었습니다.");
      fetchData();
    } catch { toast.error("메모 저장에 실패했습니다."); }
    setUpdating(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const handleExcelDownload = () => {
    const rows = filtered.map((r, idx) => ({
      "번호": filtered.length - idx,
      "신청자명": r.resident_name,
      "연락처": r.resident_phone,
      "업체명": r.vendor_name,
      "업체유형": r.vendor_type,
      "단지명": r.complex_name,
      "희망시간": r.preferred_time,
      "상태": r.status,
      "메모": r.memo ?? "",
      "신청일시": formatDate(r.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상담신청");
    const today = new Date();
    const fileName = `상담신청_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">상담신청 관리</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setRegisterOpen(true)} className="text-xs md:text-sm">
            <Plus className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">수동 등록</span>
            <span className="sm:hidden">등록</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelDownload} className="text-xs md:text-sm">
            <Download className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">엑셀 다운로드</span>
            <span className="sm:hidden">엑셀</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="text-xs md:text-sm">
            <RefreshCw className={`mr-1 md:mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
        </div>
      </div>

      {/* Vendor Type Tabs */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-1 min-w-max">
          {VENDOR_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setVendorTab(tab)}
              className={`px-3 py-2 rounded-t-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                vendorTab === tab
                  ? "text-white"
                  : "text-muted-foreground bg-muted hover:bg-muted/80"
              }`}
              style={vendorTab === tab ? { backgroundColor: "#1E3A5F" } : undefined}
            >
              {tab}
              <span
                className={`ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] md:text-xs font-semibold ${
                  vendorTab === tab
                    ? "bg-white/20 text-white"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {vendorCounts[tab] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="h-[2px]" style={{ backgroundColor: "#1E3A5F" }} />
      </div>

      {/* Vendor Name Filter */}
      {vendorTab !== "전체" && vendorNames.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">업체명:</span>
          <Select value={vendorNameFilter} onValueChange={setVendorNameFilter}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {vendorNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="h-8 md:h-9">
            <TabsTrigger value="all" className="text-xs md:text-sm">전체</TabsTrigger>
            <TabsTrigger value="대기중" className="text-xs md:text-sm">대기중</TabsTrigger>
            <TabsTrigger value="처리완료" className="text-xs md:text-sm">처리완료</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-1 md:gap-2">
          {(["all", "today", "week", "month"] as DateRange[]).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(range)}
              className="text-xs md:text-sm px-2 md:px-3"
            >
              {{ all: "전체", today: "오늘", week: "이번주", month: "이번달" }[range]}
            </Button>
          ))}
        </div>

        <span className="ml-auto text-xs md:text-sm text-muted-foreground">총 {filtered.length}건</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">번호</TableHead>
              <TableHead>신청자명</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>업체명</TableHead>
              <TableHead className="hidden sm:table-cell">단지명</TableHead>
              <TableHead className="hidden sm:table-cell">희망시간</TableHead>
              <TableHead>신청일시</TableHead>
              <TableHead className="w-24">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">로딩 중...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">데이터가 없습니다.</TableCell>
              </TableRow>
            ) : (
              filtered.map((req, idx) => (
                <TableRow
                  key={req.id}
                  className="cursor-pointer transition-colors hover:bg-blue-50"
                  onClick={() => { setSelected(req); setMemo(req.memo ?? ""); }}
                >
                  <TableCell className="font-medium">{filtered.length - idx}</TableCell>
                  <TableCell>{req.resident_name}</TableCell>
                  <TableCell>{req.resident_phone}</TableCell>
                  <TableCell>{req.vendor_name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{req.complex_name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{req.preferred_time}</TableCell>
                  <TableCell>{formatDate(req.created_at)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        req.status === "처리완료"
                          ? "border-transparent bg-green-100 text-green-800 hover:bg-green-100"
                          : "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      }
                    >
                      {req.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 수동 등록 Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>상담 수동 등록</DialogTitle>
            <DialogDescription>관리자가 직접 상담 신청을 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">고객명 <span className="text-red-500">*</span></Label>
                <Input value={regForm.resident_name} onChange={e => setReg("resident_name", e.target.value)} placeholder="홍길동" className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">연락처 <span className="text-red-500">*</span></Label>
                <Input value={regForm.resident_phone} onChange={e => setReg("resident_phone", e.target.value)} placeholder="010-0000-0000" className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">업체유형 <span className="text-red-500">*</span></Label>
                <Select value={regForm.vendor_type} onValueChange={v => setReg("vendor_type", v)}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>{VENDOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">업체명 <span className="text-red-500">*</span></Label>
                {regForm.vendor_type === "은행" ? (
                  <Select value={regForm.vendor_name} onValueChange={v => setReg("vendor_name", v)}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="은행 선택" /></SelectTrigger>
                    <SelectContent>{BANK_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={regForm.vendor_name} onChange={e => setReg("vendor_name", e.target.value)} placeholder="업체명 입력" className="h-8 mt-1" />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">단지명</Label>
                <Input value={regForm.complex_name} onChange={e => setReg("complex_name", e.target.value)} className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">희망시간</Label>
                <Select value={regForm.preferred_time} onValueChange={v => setReg("preferred_time", v)}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["오전", "오후", "저녁"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setRegisterOpen(false); setRegForm(EMPTY_FORM); }}>취소</Button>
            <Button onClick={handleRegister} disabled={registering}>{registering ? "등록 중..." : "등록"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className={selected?.vendor_type === "은행" ? "sm:max-w-2xl" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle>상담신청 상세</DialogTitle>
            <DialogDescription>신청 내역을 확인하고 상태를 변경할 수 있습니다.</DialogDescription>
          </DialogHeader>
          {selected && selected.vendor_type === "은행" ? (
            <BankDetailModal
              selected={selected}
              onClose={() => setSelected(null)}
              onRefresh={fetchData}
              formatDate={formatDate}
            />
          ) : selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">신청자명</span><p className="font-medium">{selected.resident_name}</p></div>
                <div><span className="text-muted-foreground">연락처</span><p className="font-medium">{selected.resident_phone}</p></div>
                <div><span className="text-muted-foreground">업체명</span><p className="font-medium">{selected.vendor_name}</p></div>
                <div><span className="text-muted-foreground">업체유형</span><p className="font-medium">{selected.vendor_type}</p></div>
                <div><span className="text-muted-foreground">단지명</span><p className="font-medium">{selected.complex_name}</p></div>
                <div><span className="text-muted-foreground">희망시간</span><p className="font-medium">{selected.preferred_time}</p></div>
                <div><span className="text-muted-foreground">신청일시</span><p className="font-medium">{formatDate(selected.created_at)}</p></div>
                <div><span className="text-muted-foreground">상태</span><p>
                  <Badge className={selected.status === "처리완료" ? "border-transparent bg-green-100 text-green-800 hover:bg-green-100" : "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}>{selected.status}</Badge>
                </p></div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">메모</label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모를 입력하세요..." rows={3} />
                <Button variant="outline" size="sm" className="mt-2" onClick={handleSaveMemo} disabled={updating}>메모 저장</Button>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setSelected(null)}>닫기</Button>
                <Button onClick={handleStatusChange} disabled={updating}>
                  {selected.status === "대기중" ? "처리완료로 변경" : "대기중으로 변경"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
