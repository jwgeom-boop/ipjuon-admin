import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, RefreshCw, Phone, Calendar as CalIcon } from "lucide-react";
import { format } from "date-fns";
import { evaluateUrgency, levelClasses, detectMoveInMode } from "@/lib/urgency";
import type { UrgencyHit } from "@/lib/urgency";
import { toast } from "sonner";

type Consultation = Record<string, any>;

const fmtMan = (n: number) => n === 0 ? "0" : `${(n / 10000).toLocaleString("ko-KR")}만`;

export default function BankUrgentDashboard() {
  const navigate = useNavigate();
  const { bankName } = useAuth();
  const [data, setData] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = bankName ? { bank_name: bankName } : {};
      const list = await api.getBankConsultations(params);
      setData(list ?? []);
      setLastUpdate(new Date());
    } catch { toast.error("데이터 로드 실패"); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // v3 §8.4: 1분 자동 새로고침
  useEffect(() => {
    const t = setInterval(fetchData, 60_000);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const moveInMode = useMemo(() => detectMoveInMode(data, now), [data]);

  // 모든 활성 행에 대한 긴급도 평가
  const urgencyMap = useMemo(() => {
    const m = new Map<string, UrgencyHit>();
    data.forEach(r => {
      if (r.loan_status === "done" || r.loan_status === "cancel") return;
      const hit = evaluateUrgency(r, now);
      if (hit) m.set(r.id, hit);
    });
    return m;
  }, [data]);

  // KPI 1: 최우선 (critical)
  const criticalRows = useMemo(() => {
    return data
      .filter(r => urgencyMap.get(r.id)?.level === "critical")
      .map(r => ({ ...r, _hit: urgencyMap.get(r.id)! }))
      .sort((a, b) => {
        const aD = a.moving_in_date ? new Date(a.moving_in_date).getTime() : Infinity;
        const bD = b.moving_in_date ? new Date(b.moving_in_date).getTime() : Infinity;
        return aD - bD;
      });
  }, [data, urgencyMap]);

  // KPI 2: 오늘 실행 예정
  const todayExec = useMemo(() => data.filter(r => r.execution_date === today && r.loan_status === "executing"), [data, today]);
  // KPI 3: 오늘 자서
  const todaySigning = useMemo(() => data.filter(r => r.signing_date === today && (r.loan_status === "signing_reservation" || r.loan_status === "signing")), [data, today]);
  // KPI 4: 이번 주 완료
  const weekDone = useMemo(() => {
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return data.filter(r => {
      if (r.loan_status !== "done" || !r.execution_date) return false;
      const d = new Date(r.execution_date);
      return d >= monday && d <= sunday;
    });
  }, [data]);

  // 담당자별 부하 (오늘 자서 + 오늘 실행 합산)
  const managerLoad = useMemo(() => {
    const m = new Map<string, number>();
    [...todayExec, ...todaySigning].forEach(r => {
      const k = r.manager || "(미지정)";
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [todayExec, todaySigning]);

  const todayDDayBadge = useMemo(() => {
    const movingIns = data
      .map(r => r.moving_in_date ? new Date(r.moving_in_date) : null)
      .filter((d): d is Date => d !== null);
    if (movingIns.length === 0) return null;
    movingIns.sort((a, b) => a.getTime() - b.getTime());
    const nearest = movingIns.find(d => d.getTime() >= now.getTime()) || movingIns[movingIns.length - 1];
    const diff = Math.floor((nearest.getTime() - now.getTime()) / 86400000);
    return diff === 0 ? "오늘 입주" : diff > 0 ? `최근 입주일까지 D-${diff}` : `최근 입주일 D+${-diff}`;
  }, [data]);

  const dDayLabel = (iso?: string) => {
    if (!iso) return "-";
    const d = Math.floor((new Date(iso).getTime() - now.getTime()) / 86400000);
    return d === 0 ? "D-day" : d > 0 ? `D-${d}` : `D+${-d}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate("/bank")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> 목록
          </Button>
          <h1 className="text-[14px] font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            긴급 대시보드
          </h1>
          {moveInMode && <Badge className="bg-red-100 text-red-700 border-transparent text-[10px] h-5 px-1.5">입주 집중기간</Badge>}
          {todayDDayBadge && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{todayDDayBadge}</Badge>}
          <span className="text-[11px] text-muted-foreground">자동갱신 60초</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">마지막 갱신 {lastUpdate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-hidden">
        {/* KPI 4 카드 */}
        <div className="grid grid-cols-4 gap-2.5">
          <Card className="border-l-4 border-l-red-600">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">최우선 처리</p>
              <p className="text-[26px] font-bold text-red-600 leading-tight mt-0.5">{criticalRows.length}<span className="text-[12px] font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground">자서후 4일+ / 입주일 초과</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">오늘 실행 예정</p>
              <p className="text-[26px] font-bold text-amber-600 leading-tight mt-0.5">{todayExec.length}<span className="text-[12px] font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground">자서 완료 · 정산 대기</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">오늘 자서</p>
              <p className="text-[26px] font-bold text-blue-600 leading-tight mt-0.5">{todaySigning.length}<span className="text-[12px] font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground">예약 + 진행</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">이번 주 완료</p>
              <p className="text-[26px] font-bold text-green-600 leading-tight mt-0.5">{weekDone.length}<span className="text-[12px] font-normal text-muted-foreground ml-1">건</span></p>
              <p className="text-[10px] text-muted-foreground">실행완료 · {fmtMan(weekDone.reduce((s, r) => s + (Number(r.loan_amount) || 0), 0))}원</p>
            </CardContent>
          </Card>
        </div>

        {/* 3단 패널 */}
        <div className="flex-1 grid grid-cols-[1.3fr_1fr_1fr] gap-2.5 overflow-hidden">

          {/* 좌: 최우선 처리 리스트 */}
          <Card className="overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b bg-red-50 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">최우선 처리</p>
              <span className="text-[10px] text-red-600">{criticalRows.length}건</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {criticalRows.length === 0 ? (
                <p className="p-6 text-center text-[12px] text-muted-foreground">최우선 처리 건 없음</p>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5">고객</th>
                      <th className="text-left px-3 py-1.5">동/호</th>
                      <th className="text-left px-3 py-1.5">단계</th>
                      <th className="text-left px-3 py-1.5">입주</th>
                      <th className="text-left px-3 py-1.5">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalRows.map(r => (
                      <tr
                        key={r.id}
                        className="border-t cursor-pointer hover:bg-red-50/50"
                        onClick={() => navigate(r.loan_status === "executing" ? `/bank/settlement/${r.id}` : "/bank")}
                      >
                        <td className="px-3 py-1 font-medium">{r.resident_name}</td>
                        <td className="px-3 py-1">{r.dong}-{r.ho}</td>
                        <td className="px-3 py-1">{r.loan_status}</td>
                        <td className="px-3 py-1 font-semibold text-red-600">{dDayLabel(r.moving_in_date)}</td>
                        <td className="px-3 py-1 text-red-700">{r._hit.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* 중: 오늘 일정 */}
          <Card className="overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b bg-blue-50 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">오늘 일정</p>
              <CalIcon className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* 자서 */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">자서 ({todaySigning.length})</p>
                {todaySigning.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-1.5">없음</p>
                ) : (
                  <div className="space-y-0.5">
                    {todaySigning
                      .slice()
                      .sort((a, b) => (a.signing_time || "").localeCompare(b.signing_time || ""))
                      .map(r => (
                      <div key={r.id} className="text-[11px] px-1.5 py-1 rounded hover:bg-blue-50 flex items-center gap-2">
                        <span className="text-blue-700 font-mono w-12">{r.signing_time || "--:--"}</span>
                        <span className="font-medium flex-1">{r.resident_name}</span>
                        <span className="text-muted-foreground">{r.dong}-{r.ho}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* 실행 */}
              <div className="pt-1.5 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">대출실행 ({todayExec.length})</p>
                {todayExec.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-1.5">없음</p>
                ) : (
                  <div className="space-y-0.5">
                    {todayExec.map(r => {
                      const u = urgencyMap.get(r.id);
                      const cls = u ? levelClasses[u.level] : null;
                      return (
                        <button
                          key={r.id}
                          onClick={() => navigate(`/bank/settlement/${r.id}`)}
                          className={`w-full text-left text-[11px] px-1.5 py-1 rounded flex items-center gap-2 transition ${cls ? `${cls.bg} ${cls.text}` : "hover:bg-amber-50"}`}
                        >
                          <span className="font-medium flex-1">{r.resident_name}</span>
                          <span className="text-muted-foreground">{r.dong}-{r.ho}</span>
                          <span className="text-[10px]">{fmtMan(Number(r.loan_amount) || 0)}원</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 우: 담당자 부하 + 주간 추이 */}
          <Card className="overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b bg-green-50">
              <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">담당자 부하 · 주간 추이</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">오늘 담당자별 (자서+실행)</p>
                {managerLoad.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">오늘 일정 없음</p>
                ) : (
                  <div className="space-y-1">
                    {managerLoad.map(m => {
                      const overload = m.count >= 9;
                      const heavy = m.count >= 6;
                      const max = managerLoad[0]?.count || 1;
                      return (
                        <div key={m.name} className="text-[11px]">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="font-medium">{m.name}</span>
                            <span className={overload ? "text-red-600 font-bold" : heavy ? "text-amber-600 font-semibold" : "text-muted-foreground"}>{m.count}건{overload ? " · 과부하" : heavy ? " · 부하높음" : ""}</span>
                          </div>
                          <div className="h-1.5 rounded bg-gray-100 overflow-hidden">
                            <div className={`h-full ${overload ? "bg-red-500" : heavy ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${(m.count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {managerLoad.some(m => m.count >= 9) && (
                  <p className="text-[10px] text-red-600 mt-1.5">⚠ 9건+ 담당자 → 이관 검토 필요</p>
                )}
              </div>

              <div className="pt-2.5 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">긴급도 분포</p>
                {(["critical", "urgent", "warning"] as const).map(lvl => {
                  const n = Array.from(urgencyMap.values()).filter(h => h.level === lvl).length;
                  const cls = levelClasses[lvl];
                  return (
                    <div key={lvl} className={`flex justify-between items-center text-[11px] px-2 py-1 rounded mb-0.5 ${cls.bg} ${cls.text}`}>
                      <span>{cls.label}</span>
                      <span className="font-bold">{n}건</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
