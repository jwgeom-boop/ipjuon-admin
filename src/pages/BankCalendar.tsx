// v3 §7 캘린더 화면 — 월 단위 자서/실행/이사 이벤트 뷰
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Phone } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

type Consultation = Record<string, any>;
type EventKind = "signing" | "execution" | "movingIn";

const KIND_META: Record<EventKind, { label: string; short: string; color: string; bg: string; dot: string; dateField: string; timeField?: string }> = {
  signing:   { label: "자서",   short: "자", color: "text-blue-700",   bg: "bg-blue-100",   dot: "bg-blue-500",   dateField: "signing_date", timeField: "signing_time" },
  execution: { label: "실행",   short: "실", color: "text-amber-700",  bg: "bg-amber-100",  dot: "bg-amber-500",  dateField: "execution_date" },
  movingIn:  { label: "이사",   short: "이", color: "text-rose-700",   bg: "bg-rose-100",   dot: "bg-rose-500",   dateField: "moving_in_date" },
};

interface CalEvent {
  kind: EventKind;
  row: Consultation;
  time?: string;
}

export default function BankCalendar() {
  const navigate = useNavigate();
  const { bankName } = useAuth();
  const [data, setData] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [enabled, setEnabled] = useState<Record<EventKind, boolean>>({ signing: true, execution: true, movingIn: true });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = bankName ? { bank_name: bankName } : {};
      const list = await api.getBankConsultations(params);
      setData(list ?? []);
    } catch { toast.error("데이터 로드 실패"); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 날짜별 이벤트 맵
  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    const push = (dateStr: string, ev: CalEvent) => {
      if (!m.has(dateStr)) m.set(dateStr, []);
      m.get(dateStr)!.push(ev);
    };
    data.forEach(r => {
      if (r.loan_status === "cancel") return;
      (Object.keys(KIND_META) as EventKind[]).forEach(kind => {
        const meta = KIND_META[kind];
        const d = r[meta.dateField];
        if (!d) return;
        const key = String(d).slice(0, 10);
        push(key, { kind, row: r, time: meta.timeField ? r[meta.timeField] : undefined });
      });
    });
    return m;
  }, [data]);

  // 월별 카운트
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const monthStats = useMemo(() => {
    const stat: Record<EventKind, number> = { signing: 0, execution: 0, movingIn: 0 };
    days.forEach(d => {
      if (!isSameMonth(d, cursor)) return;
      const key = format(d, "yyyy-MM-dd");
      (eventsByDate.get(key) ?? []).forEach(e => { stat[e.kind] += 1; });
    });
    return stat;
  }, [days, cursor, eventsByDate]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const selectedEvents = (eventsByDate.get(selectedKey) ?? []).filter(e => enabled[e.kind]);

  const openRow = (r: Consultation) => {
    // 대출실행 단계면 정산 화면, 아니면 메인 대시보드로
    if (r.loan_status === "executing") navigate(`/bank/settlement/${r.id}`);
    else navigate("/bank");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/bank")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> 대시보드
          </Button>
          <span className="text-lg font-bold text-gray-800">캘린더</span>
          <Badge className="bg-blue-100 text-blue-700 border-transparent">은행 상담사</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{bankName}</span>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
        </div>
      </header>

      <div className="p-4 grid gap-4" style={{ gridTemplateColumns: "1fr 360px" }}>
        {/* 캘린더 */}
        <Card>
          <CardContent className="p-3">
            {/* 월 이동 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCursor(subMonths(cursor, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-base font-bold min-w-[120px] text-center">
                  {format(cursor, "yyyy년 M월", { locale: ko })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>
                  오늘
                </Button>
              </div>

              {/* 이벤트 필터 + 월 통계 */}
              <div className="flex items-center gap-3 text-[11px]">
                {(Object.keys(KIND_META) as EventKind[]).map(k => {
                  const m = KIND_META[k];
                  const active = enabled[k];
                  return (
                    <button
                      key={k}
                      onClick={() => setEnabled(s => ({ ...s, [k]: !s[k] }))}
                      className={`px-2 py-1 rounded border flex items-center gap-1.5 ${active ? `${m.bg} ${m.color} border-transparent` : "bg-white text-gray-400 border-gray-200"}`}
                      title={active ? "끄기" : "켜기"}
                    >
                      <span className={`w-2 h-2 rounded-full ${active ? m.dot : "bg-gray-300"}`} />
                      {m.label} {monthStats[k]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 text-[11px] font-medium text-gray-500 border-b">
              {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
                <div key={w} className={`py-1 text-center ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}>{w}</div>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div className="grid grid-cols-7">
              {days.map(d => {
                const key = format(d, "yyyy-MM-dd");
                const evs = (eventsByDate.get(key) ?? []).filter(e => enabled[e.kind]);
                const inMonth = isSameMonth(d, cursor);
                const isSelected = isSameDay(d, selectedDay);
                const dow = d.getDay();
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDay(d)}
                    className={`border-b border-r min-h-[92px] p-1 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50 ring-1 ring-blue-400" : "hover:bg-gray-50"
                    } ${!inMonth ? "bg-gray-50/50" : ""}`}
                  >
                    <div className={`flex items-center justify-between text-[11px] mb-1 ${
                      !inMonth ? "text-gray-300" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-gray-700"
                    }`}>
                      <span className={`${isToday(d) ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold" : "font-medium"}`}>
                        {format(d, "d")}
                      </span>
                      {evs.length > 0 && <span className="text-[10px] text-gray-400">{evs.length}</span>}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0, 3).map((e, i) => {
                        const m = KIND_META[e.kind];
                        const name = e.row.resident_name || "-";
                        return (
                          <div
                            key={i}
                            className={`text-[10px] px-1 py-[1px] rounded truncate ${m.bg} ${m.color}`}
                            onClick={(ev) => { ev.stopPropagation(); setSelectedDay(d); }}
                            title={`${m.label}: ${name}`}
                          >
                            <span className="font-bold">{m.short}</span> {name}
                          </div>
                        );
                      })}
                      {evs.length > 3 && (
                        <div className="text-[10px] text-gray-500 pl-1">+{evs.length - 3}건</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 선택일 상세 */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">
                {format(selectedDay, "M월 d일 (E)", { locale: ko })}
              </span>
              <Badge variant="outline">{selectedEvents.length}건</Badge>
            </div>

            {loading ? (
              <div className="text-center py-10 text-xs text-muted-foreground">로딩 중...</div>
            ) : selectedEvents.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">이 날짜에는 일정이 없습니다.</div>
            ) : (
              <div className="space-y-1.5 max-h-[calc(100vh-180px)] overflow-y-auto">
                {(["signing", "execution", "movingIn"] as EventKind[]).map(kind => {
                  const evs = selectedEvents.filter(e => e.kind === kind);
                  if (evs.length === 0) return null;
                  const m = KIND_META[kind];
                  return (
                    <div key={kind}>
                      <div className={`text-[11px] font-bold mb-1 flex items-center gap-1.5 ${m.color}`}>
                        <span className={`w-2 h-2 rounded-full ${m.dot}`} /> {m.label} ({evs.length})
                      </div>
                      <div className="space-y-1">
                        {evs
                          .sort((a, b) => (a.time ?? "~").localeCompare(b.time ?? "~"))
                          .map((e, i) => {
                            const r = e.row;
                            const dongHo = [r.dong, r.ho].filter(Boolean).join("-");
                            return (
                              <div
                                key={i}
                                onClick={() => openRow(r)}
                                className={`px-2 py-1.5 rounded border ${m.bg} border-transparent hover:border-gray-300 cursor-pointer`}
                              >
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="font-medium">
                                    {e.time && <span className="text-gray-600 mr-1">{e.time}</span>}
                                    {r.resident_name || "-"}
                                  </span>
                                  <span className="text-[10px] text-gray-500">{dongHo}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-600 mt-0.5">
                                  <span>{r.manager ?? "-"} · {r.vendor_name ?? "-"}</span>
                                  {r.resident_phone && (
                                    <a
                                      href={`tel:${r.resident_phone}`}
                                      onClick={(ev) => ev.stopPropagation()}
                                      className="flex items-center gap-0.5 text-blue-600 hover:underline"
                                    >
                                      <Phone className="h-2.5 w-2.5" /> {r.resident_phone}
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
