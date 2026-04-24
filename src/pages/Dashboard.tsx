import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell,
} from "@/components/ui/table";
import {
  ClipboardList, Clock, CheckCircle, Wallet,
  ChevronDown, ChevronUp, ArrowRight,
  Sofa, Truck, Wifi, Sparkles, Armchair, Tv,
  type LucideIcon,
} from "lucide-react";

type ConsultationRow = {
  id: string;
  resident_name: string;
  vendor_name: string;
  vendor_type: string;
  preferred_time: string;
  status: string;
  created_at: string;
};

type BankSummary = {
  bank_name: string;
  total_count: number;
  done_count: number;
  done_amount: number;
  wait_count: number;
  today_count: number;
};

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
const isBankType = (type: string) => type === "bank" || type === "은행";

const VENDOR_META: Record<string, { color: string; icon: LucideIcon }> = {
  인테리어: { color: "hsl(28, 80%, 50%)", icon: Sofa },
  이사: { color: "hsl(270, 50%, 55%)", icon: Truck },
  "인터넷·TV": { color: "hsl(190, 65%, 45%)", icon: Wifi },
  청소: { color: "hsl(150, 50%, 45%)", icon: Sparkles },
  가구: { color: "hsl(340, 60%, 55%)", icon: Armchair },
  가전: { color: "hsl(45, 75%, 50%)", icon: Tv },
};
const VENDOR_FALLBACK = { color: "hsl(220, 10%, 55%)", icon: ClipboardList };
const todayKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const isToday = (iso: string) => iso.startsWith(todayKey);
const isWaiting = (status: string) => status === "대기중" || status === "처리중";
const isDone = (status: string) => status === "처리완료" || status === "완료";

const formatAmountKRW = (won: number): string => {
  if (won >= 100_000_000) return `${(won / 100_000_000).toFixed(1)}억`;
  if (won >= 10_000) return `${Math.round(won / 10_000).toLocaleString()}만`;
  return won.toLocaleString();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [bankSummary, setBankSummary] = useState<BankSummary[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [c, b] = await Promise.all([
        api.getConsultations(),
        api.getBankSummaryByBank(),
      ]);
      setConsultations(c);
      setBankSummary(b);
    } catch {
      console.error("데이터 로드 실패");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ────────── 은행 섹션 KPI ────────── */
  const bankKPI = useMemo(() => {
    const totalCount = bankSummary.reduce((s, r) => s + r.total_count, 0);
    const waitCount = bankSummary.reduce((s, r) => s + r.wait_count, 0);
    const doneCount = bankSummary.reduce((s, r) => s + r.done_count, 0);
    const doneAmount = bankSummary.reduce((s, r) => s + r.done_amount, 0);
    return { totalCount, waitCount, doneCount, doneAmount };
  }, [bankSummary]);

  /* ────────── 기타 업체 섹션 ────────── */
  type OtherStat = {
    name: string;
    total: number;
    waiting: number;
    done: number;
    today: number;
    color: string;
    icon: LucideIcon;
  };
  const { otherStats, otherRecent, otherTotal } = useMemo(() => {
    const others = consultations.filter((r) => !isBankType(r.vendor_type));
    const map = new Map<string, OtherStat>();
    for (const r of others) {
      const name = normalizeVendorType(r.vendor_type);
      const meta = VENDOR_META[name] ?? VENDOR_FALLBACK;
      const cur = map.get(name) ?? { name, total: 0, waiting: 0, done: 0, today: 0, color: meta.color, icon: meta.icon };
      cur.total += 1;
      if (isWaiting(r.status)) cur.waiting += 1;
      if (isDone(r.status)) cur.done += 1;
      if (isToday(r.created_at)) cur.today += 1;
      map.set(name, cur);
    }
    const stats = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const recent = [...others]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    return { otherStats: stats, otherRecent: recent, otherTotal: others.length };
  }, [consultations]);

  /* ────────── 통합 KPI 카드 ────────── */
  const stats = [
    { label: "은행 상담건수", value: bankKPI.totalCount.toLocaleString(), suffix: "건", icon: ClipboardList, bg: "hsl(213, 50%, 24%)" },
    { label: "대기중", value: bankKPI.waitCount.toLocaleString(), suffix: "건", icon: Clock, bg: "hsl(40, 80%, 50%)" },
    { label: "실행 완료", value: bankKPI.doneCount.toLocaleString(), suffix: "건", icon: CheckCircle, bg: "hsl(150, 50%, 35%)" },
    { label: "실행금액 합계", value: formatAmountKRW(bankKPI.doneAmount), suffix: "원", icon: Wallet, bg: "hsl(258, 50%, 45%)" },
  ];

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">대시보드</h1>
        <Badge variant="outline" className="text-xs">10초 자동 갱신</Badge>
      </div>

      {/* ───── 메인: 은행 섹션 ───── */}
      <section className="space-y-3 md:space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base md:text-lg font-semibold">협약은행 현황</h2>
          <span className="text-xs text-muted-foreground">실시간 상담·실행 집계</span>
        </div>

        {/* KPI 4카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                  <s.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="text-2xl md:text-3xl font-bold">
                  {s.value}
                  <span className="text-sm md:text-base font-normal text-muted-foreground ml-1">{s.suffix}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 은행별 카드 그리드 */}
        {bankSummary.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              협약은행 데이터가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {bankSummary.map((bank) => {
              const progress = bank.total_count > 0
                ? Math.round((bank.done_count / bank.total_count) * 100)
                : 0;
              return (
                <Card
                  key={bank.bank_name}
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/consultation?vendor=${encodeURIComponent(bank.bank_name)}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-1">
                    <CardTitle className="text-sm md:text-base font-semibold">{bank.bank_name}</CardTitle>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardHeader>
                  <CardContent className="p-3 md:p-4 pt-0 space-y-2">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>상담 <span className="text-foreground font-semibold text-sm">{bank.total_count}</span>건</span>
                      <span>실행 <span className="text-foreground font-semibold text-sm">{bank.done_count}</span>건</span>
                    </div>
                    <div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: progress >= 70 ? "hsl(150, 50%, 45%)"
                              : progress >= 30 ? "hsl(213, 70%, 50%)"
                              : "hsl(40, 80%, 55%)",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">진행률 {progress}%</p>
                    </div>
                    <div className="pt-1 border-t flex items-baseline justify-between">
                      <span className="text-[11px] text-muted-foreground">실행금액</span>
                      <span className="text-base md:text-lg font-bold" style={{ color: "hsl(258, 50%, 45%)" }}>
                        ₩ {formatAmountKRW(bank.done_amount)}
                      </span>
                    </div>
                    {bank.today_count > 0 && (
                      <div className="text-[10px] text-blue-600 font-medium">오늘 신규 +{bank.today_count}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ───── 보조: 기타 업체 섹션 ───── */}
      <section className="space-y-3 md:space-y-4">
        <button
          type="button"
          onClick={() => setOtherOpen((v) => !v)}
          className="w-full flex items-center justify-between px-1 py-2 hover:bg-muted/50 rounded transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base md:text-lg font-semibold">기타 업체 현황</h2>
            <Badge variant="secondary" className="text-xs">총 {otherTotal}건</Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">인테리어·이사·인터넷·청소·가구·가전</span>
          </div>
          {otherOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {otherOpen && (
          <>
            {/* 카테고리 카드 그리드 */}
            {otherStats.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  기타 업체 신청 데이터가 없습니다.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {otherStats.map((s) => {
                  const Icon = s.icon;
                  const doneRate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                  return (
                    <Card
                      key={s.name}
                      className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/consultation?type=${encodeURIComponent(s.name)}`)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color }}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{s.name}</p>
                          <p className="text-2xl font-bold leading-tight">{s.total}<span className="text-xs font-normal text-muted-foreground ml-1">건</span></p>
                        </div>
                        <div className="flex items-baseline justify-between text-[11px] text-muted-foreground border-t pt-1.5">
                          <span>대기 <span className="text-foreground font-semibold">{s.waiting}</span></span>
                          <span>완료 <span className="text-foreground font-semibold">{s.done}</span></span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full transition-all" style={{ width: `${doneRate}%`, backgroundColor: s.color }} />
                        </div>
                        {s.today > 0 && (
                          <div className="text-[10px] text-blue-600 font-medium">오늘 +{s.today}</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 최근 기타 신청 */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
                <CardTitle className="text-sm md:text-base">최근 기타 신청</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate("/consultation")} className="text-xs">
                  전체보기
                </Button>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {otherRecent.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">신청 내역이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">신청자명</TableHead>
                          <TableHead className="text-xs">업체명</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">유형</TableHead>
                          <TableHead className="text-xs">상태</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">신청일시</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {otherRecent.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium text-xs">{r.resident_name}</TableCell>
                            <TableCell className="text-xs">{r.vendor_name}</TableCell>
                            <TableCell className="text-xs hidden sm:table-cell">{normalizeVendorType(r.vendor_type)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={r.status === "처리완료" ? "default" : "secondary"}
                                className={`text-xs ${
                                  r.status === "처리완료"
                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                    : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{formatDate(r.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
