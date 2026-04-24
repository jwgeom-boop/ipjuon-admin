import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "../layout/AppShell";
import { HeroStrip } from "../home/HeroStrip";
import { HeaderActions } from "../home/HeaderActions";
import { TaskSection } from "../home/TaskSection";
import { TaskRow, type TaskItem } from "../home/TaskRow";
import { DetailTaskRow } from "../home/DetailTaskRow";
import { WeekMini } from "../home/WeekMini";
import { CapacityCard } from "../home/CapacityCard";
import { RecentActivity } from "../home/RecentActivity";
import { UpcomingList } from "../home/UpcomingList";
import { SigningListModal } from "../home/SigningListModal";
import { IntegratedReportModal } from "../home/IntegratedReportModal";
import { ConsultationListModal } from "../home/ConsultationListModal";
import { MonthlyPerformanceModal } from "../home/MonthlyPerformanceModal";
import { NewCustomerModal, type NewCustomerData } from "../home/NewCustomerModal";
import { AddComplexModal } from "../home/AddComplexModal";
import { InterventionQueue } from "../team/InterventionQueue";
import { PipelineOverviewModal } from "../team/PipelineOverviewModal";
import { getDemoAssigneeName } from "../auth/role";
import { api } from "@/lib/api";

const ALL_COMPLEXES = "전체 아파트";
const ADD_COMPLEX_SENTINEL = "+ 새 아파트 추가";
const COMPLEX = "봄여름가을겨울3차";
const DEFAULT_COMPLEXES = [
  COMPLEX,
  "포항학산더휴",
  "자이더테라스파크",
  "힐스테이트포레스타",
];

const STORAGE_KEY = "v4.selectedComplex";
const COMPLEXES_STORAGE_KEY = "v4.complexes";

const getComplexFromAddress = (addressLabel?: string) => {
  if (!addressLabel) return "";
  const parts = addressLabel.split("·");
  return parts[1]?.trim() ?? "";
};

const INBOX: TaskItem[] = [
  {
    id: "new-choi-seyoung",
    urgency: "warning",
    customerName: "최세영",
    addressLabel: `104-1502 · ${COMPLEX}`,
    nextAction: "신규 접수 — 최초 상담 연락 필요",
    tag: "신규",
    time: "접수 2시간 전",
    phone: "010-9911-2034",
    assignee: "김주임",
  },
  {
    id: "new-yang-jihye",
    urgency: "warning",
    customerName: "양지혜",
    addressLabel: `103-807 · 포항학산더휴`,
    nextAction: "신규 접수 — 자서 가능 일정 확인 필요",
    tag: "신규",
    time: "접수 5시간 전",
    phone: "010-3344-5566",
    assignee: "박과장",
  },
  {
    id: "uncontacted-lee-jaemin",
    urgency: "urgent",
    customerName: "이재민",
    addressLabel: `101-1803 · ${COMPLEX}`,
    nextAction: "연락 3회 시도 — 문자 발송 후 대기",
    tag: "미상담",
    time: "D+2 경과",
    phone: "010-2233-4455",
    assignee: "이대리",
  },
  {
    id: "uncontacted-song-minho",
    urgency: "warning",
    customerName: "송민호",
    addressLabel: `102-605 · 자이더테라스파크`,
    nextAction: "접수 후 상담 미개시 — 우선 컨택 필요",
    tag: "미상담",
    time: "D+1 경과",
    phone: "010-7788-9911",
    assignee: "김주임",
  },
];

const SAMPLES: TaskItem[] = [
  {
    id: "han-oyoung",
    urgency: "critical",
    customerName: "한오영",
    addressLabel: `101-603 · ${COMPLEX}`,
    nextAction: "대출실행 정산 확정 — 필요자금 127,413,216원 고객 납부 대기",
    tag: "실행",
    time: "D-1",
    assignee: "박과장",
    fundsAmount: 127413216,
    fundsStatus: "pending",
    closingDate: "5/16",
    legalAgent: "동백",
    size: 84,
    residentNo: "780513-2******",
    phones: ["010-4521-7788"],
    executionDate: "2026-05-16",
    loanAmount: 280000000,
    intermediatePrincipal: 168000000,
    intermediateInterest: 4213216,
    shortfallPrincipal: 110000000,
    shortfallInterest: 0,
    balconyAmount: 7000000,
    preMgmtFee: 270000,
    note: "입금되어 있음 // 당일 오전 실행",
    internalNote: "배우자: 010-4615-2218",
    moveInDate: "5/16",
    checkpoints: [
      { label: "정산서", done: true },
      { label: "입금", done: false },
      { label: "등기/근저당", done: false },
      { label: "실행", done: false },
    ],
  },
  {
    id: "cho-yoonkyung",
    urgency: "urgent",
    customerName: "조윤경",
    addressLabel: `102-1805 · ${COMPLEX}`,
    nextAction: "자서 후 서류 미취합 — 주민등록등본 누락",
    tag: "지연",
    time: "D-3",
    assignee: "김주임",
    signingSlot: "본점 2층 11:00",
    signingPlace: "국민은행 본점 2층 상담실 A",
    signingDate: "2026-04-22",
    signingDateLabel: "4/22 오전 11시",
    loanAmount: 245000000,
    executionDate: "2026-05-12",
    repayment: "30년 원리금균등",
    borrower: "조윤경",
    phones: ["010-5512-7733"],
    note: "자서 후 주민등록등본 미제출 — 4/25까지 제출 요청",
    noticeStatus: "confirmed",
    size: 72,
    residentNo: "820317-2******",
    intermediatePrincipal: 0,
    intermediateInterest: 0,
    shortfallPrincipal: 132450000,
    shortfallInterest: 0,
    balconyAmount: 7000000,
    preMgmtFee: 280000,
    moveInDate: "5/12",
    documents: [
      { label: "신분증", received: true },
      { label: "주민등록등본", received: false },
      { label: "혼인관계증명서", received: true },
      { label: "인감증명서", received: true },
      { label: "통장 사본", received: true },
    ],
  },
  {
    id: "lee-bokhee",
    urgency: "normal",
    customerName: "이복희",
    addressLabel: `101-801 · ${COMPLEX}`,
    nextAction: "대출 실행 — 정산 내역 확인 완료, 실행만 남음",
    tag: "실행",
    time: "11:00",
    assignee: "이대리",
    fundsAmount: 187200000,
    fundsStatus: "settled",
    closingDate: "5/14",
    legalAgent: "한빛",
    size: 64,
    residentNo: "690828-2******",
    phones: ["010-8581-5308"],
    executionDate: "2026-04-23",
    loanAmount: 223000000,
    intermediatePrincipal: 172888044,
    intermediateInterest: 616634,
    shortfallPrincipal: 114661956,
    shortfallInterest: 0,
    balconyAmount: 7000000,
    preMgmtFee: 270000,
    note: "금요일 입금예정 // 12시 입주",
    moveInDate: "5/14",
    checkpoints: [
      { label: "정산서", done: true },
      { label: "입금", done: true },
      { label: "등기/근저당", done: true },
      { label: "실행", done: false },
    ],
  },
  {
    id: "kim-okhee",
    urgency: "normal",
    customerName: "김옥희",
    addressLabel: `102-3006 · ${COMPLEX}`,
    nextAction: "자서예약 — 지참서류 안내 발송 필요",
    tag: "자서예약",
    time: "14:30",
    assignee: "김주임",
    signingSlot: "본점 2층 14:30",
    signingPlace: "국민은행 본점 2층 상담실 B",
    signingDate: "2026-05-14",
    signingDateLabel: "5/14 오후 2시 30분",
    loanAmount: 320000000,
    executionDate: "2026-05-16",
    repayment: "30년 원리금균등",
    borrower: "김옥희",
    phones: ["010-2233-4455"],
    note: "",
    noticeStatus: "unsent",
    size: 78,
    residentNo: "650822-2******",
    intermediatePrincipal: 0,
    intermediateInterest: 0,
    shortfallPrincipal: 147570194,
    shortfallInterest: 0,
    balconyAmount: 8000000,
    preMgmtFee: 320000,
    moveInDate: "5/14",
    documents: [
      { label: "신분증", received: true },
      { label: "주민등록등본", received: false },
      { label: "혼인관계증명서", received: false },
      { label: "인감증명서", received: false },
      { label: "통장 사본", received: true },
    ],
  },
  {
    id: "park-junyoung",
    urgency: "normal",
    customerName: "박준영",
    addressLabel: `103-502 · 포항학산더휴`,
    nextAction: "가심사 서류 접수 완료 — 은행 심사 대기",
    tag: "심사중",
    time: "15:00",
    assignee: "박과장",
  },
  {
    id: "jang-minji",
    urgency: "warning",
    customerName: "장민지",
    addressLabel: `101-1204 · 자이더테라스파크`,
    nextAction: "결과 안내 지연 — 고객 연락 4회 시도",
    tag: "재연락",
    time: "16:30",
    assignee: "이대리",
  },
];

const WEEK_THIS: TaskItem[] = [
  {
    id: "cho-eunhee",
    urgency: "normal",
    customerName: "조은희",
    addressLabel: `102-1001 · ${COMPLEX}`,
    nextAction: "실행 예정 — 필요자금 132,340,723원 입금요청",
    tag: "실행",
    time: "목 10:00",
    assignee: "김주임",
    fundsAmount: 132340723,
    fundsStatus: "received",
    closingDate: "5/15",
    legalAgent: "동백",
    size: 49,
    residentNo: "750418-2******",
    phones: ["010-5547-2210"],
    executionDate: "2026-04-24",
    loanAmount: 185000000,
    intermediatePrincipal: 143018192,
    intermediateInterest: 525416,
    shortfallPrincipal: 94851808,
    shortfallInterest: 0,
    balconyAmount: 5000000,
    preMgmtFee: 210000,
    note: "당일 오전 입금 // 12시반 입주",
    moveInDate: "5/15",
    checkpoints: [
      { label: "정산서", done: true },
      { label: "입금", done: true },
      { label: "등기/근저당", done: false },
      { label: "실행", done: false },
    ],
  },
  {
    id: "han-ohyoung-2",
    urgency: "normal",
    customerName: "김진호",
    addressLabel: `102-3606 · 힐스테이트포레스타`,
    nextAction: "자서예약 — 정산 사전 입력 필요",
    tag: "자서예약",
    time: "금 14:00",
    assignee: "박과장",
    signingSlot: "본점 2층 14:00",
    signingPlace: "국민은행 본점 2층 상담실 A",
    signingDate: "2026-05-15",
    signingDateLabel: "5/15 오후 2시",
    loanAmount: 410000000,
    executionDate: "2026-05-20",
    repayment: "30년 원금균등",
    borrower: "김진호",
    phones: ["010-7788-9911", "010-2395-3639"],
    note: "배우자 동반",
    noticeStatus: "confirmed",
    companion: "배우자 동반",
    size: 84,
    residentNo: "830627-1******",
    intermediatePrincipal: 247219940,
    intermediateInterest: 792724,
    shortfallPrincipal: 183035060,
    shortfallInterest: 0,
    balconyAmount: 9000000,
    preMgmtFee: 350000,
    moveInDate: "5/15",
    documents: [
      { label: "신분증", received: true },
      { label: "주민등록등본", received: true },
      { label: "혼인관계증명서", received: true },
      { label: "인감증명서", received: false },
    ],
  },
  {
    id: "lee-duna",
    urgency: "normal",
    customerName: "이두나·최주행",
    addressLabel: `113-1102 · ${COMPLEX}`,
    nextAction: "자서예약 — 부부 공동명의",
    tag: "자서예약",
    time: "월 13:00",
    assignee: "박과장",
    signingSlot: "본점 2층 13:00",
    signingPlace: "국민은행 본점 2층 상담실 A",
    signingDate: "2026-05-18",
    signingDateLabel: "5/18 오후 1시",
    loanAmount: 650000000,
    executionDate: "2026-05-26",
    repayment: "1년 거치 29년 원리금",
    borrower: "이두나",
    phones: ["010-2889-5675", "010-2395-3639"],
    note: "공동명의",
    noticeStatus: "sent",
    size: 84,
    residentNo: "880911-2******",
    intermediatePrincipal: 182311746,
    intermediateInterest: 0,
    shortfallPrincipal: 117822416,
    shortfallInterest: 0,
    balconyAmount: 7000000,
    preMgmtFee: 270000,
    moveInDate: "5/18",
    documents: [
      { label: "신분증", received: true },
      { label: "주민등록등본", received: true },
      { label: "혼인관계증명서", received: false },
      { label: "인감증명서", received: false },
    ],
  },
];

type CategoryKey = "all" | "inbox" | "today" | "signing" | "execution";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "inbox", label: "신규·미상담" },
  { key: "today", label: "오늘" },
  { key: "signing", label: "자서예약" },
  { key: "execution", label: "실행예정" },
];

const ALL_ASSIGNEE = "전체";

const isSigningTag = (tag?: string) => tag === "자서";
const isExecutionTag = (tag?: string) => tag === "실행";

export default function V4Home() {
  const { bankName, loginId } = useAuth();
  const navigate = useNavigate();
  const display = bankName || "국민은행";
  const myAssignee = getDemoAssigneeName(loginId);
  const [category, setCategory] = useState<CategoryKey>("all");
  const [assignee, setAssignee] = useState<string>(ALL_ASSIGNEE);
  const [complexes, setComplexes] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COMPLEXES;
    const raw = window.localStorage.getItem(COMPLEXES_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((c) => typeof c === "string" && c.trim())) {
          return parsed;
        }
      } catch {
        /* fall through */
      }
    }
    return DEFAULT_COMPLEXES;
  });
  const [selectedComplex, setSelectedComplex] = useState<string>(() => {
    if (typeof window === "undefined") return ALL_COMPLEXES;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === ALL_COMPLEXES) return stored;
    return stored || ALL_COMPLEXES;
  });
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [consultationListOpen, setConsultationListOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [addComplexOpen, setAddComplexOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, selectedComplex);
  }, [selectedComplex]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COMPLEXES_STORAGE_KEY, JSON.stringify(complexes));
  }, [complexes]);

  useEffect(() => {
    if (
      selectedComplex !== ALL_COMPLEXES &&
      !complexes.includes(selectedComplex)
    ) {
      setSelectedComplex(ALL_COMPLEXES);
    }
  }, [complexes, selectedComplex]);

  const complexOptions = useMemo(
    () => [ALL_COMPLEXES, ...complexes, ADD_COMPLEX_SENTINEL],
    [complexes]
  );

  const handleComplexChange = (v: string) => {
    if (v === ADD_COMPLEX_SENTINEL) {
      setAddComplexOpen(true);
      return;
    }
    setSelectedComplex(v);
  };

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    [...INBOX, ...SAMPLES, ...WEEK_THIS].forEach((t) => {
      if (t.assignee) set.add(t.assignee);
    });
    return [ALL_ASSIGNEE, ...Array.from(set).sort()];
  }, []);

  const byAssignee = (t: TaskItem) =>
    assignee === ALL_ASSIGNEE ? true : t.assignee === assignee;

  const byComplex = (t: TaskItem) =>
    selectedComplex === ALL_COMPLEXES
      ? true
      : getComplexFromAddress(t.addressLabel) === selectedComplex;

  const matches = (t: TaskItem) => byAssignee(t) && byComplex(t);

  const inboxList = useMemo(() => INBOX.filter(matches), [assignee, selectedComplex]);
  const upcomingList = useMemo(
    () => WEEK_THIS.filter(matches),
    [assignee, selectedComplex]
  );

  const { nowList, todayList } = useMemo(() => {
    const filtered = SAMPLES.filter(matches);
    const now = filtered.filter((t) => t.urgency === "critical" || t.urgency === "urgent");
    const today = filtered.filter((t) => t.urgency !== "critical" && t.urgency !== "urgent");
    return { nowList: now, todayList: today };
  }, [assignee, selectedComplex]);

  const signingList = useMemo(
    () =>
      [...INBOX, ...SAMPLES, ...WEEK_THIS]
        .filter(matches)
        .filter((t) => isSigningTag(t.tag)),
    [assignee, selectedComplex]
  );
  const executionList = useMemo(
    () =>
      [...INBOX, ...SAMPLES, ...WEEK_THIS]
        .filter(matches)
        .filter((t) => isExecutionTag(t.tag)),
    [assignee, selectedComplex]
  );

  const filteredAll = useMemo(
    () => [...INBOX, ...SAMPLES, ...WEEK_THIS].filter(byComplex),
    [selectedComplex]
  );

  const categoryCounts = useMemo(() => {
    const sampleFiltered = SAMPLES.filter(matches);
    const todayCount = sampleFiltered.length;
    const all =
      INBOX.filter(matches).length +
      sampleFiltered.length +
      WEEK_THIS.filter(matches).length;
    const allWithSidebars = [...INBOX, ...SAMPLES, ...WEEK_THIS].filter(matches);
    return {
      all,
      inbox: INBOX.filter(matches).length,
      today: todayCount,
      signing: allWithSidebars.filter((t) => isSigningTag(t.tag)).length,
      execution: allWithSidebars.filter((t) => isExecutionTag(t.tag)).length,
    } as Record<CategoryKey, number>;
  }, [assignee, selectedComplex]);

  const today = new Date();
  const weekEvents = [
    { date: today, signing: 2, execution: 2 },
    { date: addDays(today, 1), signing: 1, execution: 1 },
    { date: addDays(today, 2), execution: 1 },
    { date: addDays(today, 3), signing: 3 },
    { date: addDays(today, 4), execution: 2 },
  ];

  const monthly = [
    { month: "4월", count: 3, billion: 10.14 },
    { month: "5월", count: 6, billion: 18.77 },
    { month: "6월", count: 2, billion: 4.96 },
  ];

  const activity = [
    { id: "a1", time: "10:42", who: "한오영", what: "메모 추가 · '입금 확인 요청'" },
    { id: "a2", time: "10:31", who: "이복희", what: "정산 내역 확정" },
    { id: "a3", time: "09:58", who: "박준영", what: "가심사 서류 접수" },
    { id: "a4", time: "09:15", who: "김옥희", what: "자서 예약 확정 14:30" },
  ];

  const handleOpen = (id: string) => {
    const all = [...INBOX, ...SAMPLES, ...WEEK_THIS];
    const task = all.find((t) => t.id === id);
    const tag = task?.tag ?? "";
    if (tag === "신규" || tag === "미상담" || tag === "재연락") {
      navigate(`/v4/wizard/consultation/${id}`);
      return;
    }
    if (tag === "자서" || tag === "지연") {
      navigate(`/v4/wizard/signing/${id}`);
      return;
    }
    navigate(`/v4/wizard/execution/${id}`);
  };

  const handleCall = (id: string) => {
    const task = INBOX.find((t) => t.id === id);
    if (task?.phone) window.open(`tel:${task.phone.replace(/-/g, "")}`);
  };

  const handleSms = (id: string) => {
    const task = INBOX.find((t) => t.id === id);
    if (task?.phone) window.open(`sms:${task.phone.replace(/-/g, "")}`);
  };

  const showInbox = category === "all" || category === "inbox";
  const showNow = category === "all" || category === "today";
  const showToday = category === "all" || category === "today";
  const showSigning = category === "signing";
  const showExecution = category === "execution";

  return (
    <AppShell>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "20px 40px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <HeroStrip
          bankName={display}
          complex={{
            value: selectedComplex,
            options: complexOptions,
            onChange: handleComplexChange,
          }}
          progress={{ done: 0, total: SAMPLES.filter(byComplex).length }}
          actions={
            <HeaderActions
              onAction={(key) => {
                if (key === "new") setNewCustomerOpen(true);
                else if (key === "signing") setSigningModalOpen(true);
                else if (key === "print") setReportModalOpen(true);
                else if (key === "list") setConsultationListOpen(true);
                else if (key === "pipeline") setPipelineOpen(true);
                else if (key === "monthly") setMonthlyOpen(true);
              }}
            />
          }
        />

        {/* Filter — grouped: 보기 / 담당자 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 2px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--v4-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              보기
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {CATEGORIES.map((f) => {
                const active = category === f.key;
                const cnt = categoryCounts[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setCategory(f.key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11.5,
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid transparent",
                      background: active ? "var(--v4-text-primary)" : "transparent",
                      color: active ? "#fff" : "var(--v4-text-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {f.label}
                    {cnt > 0 ? (
                      <span
                        className="v4-tabular"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          color: active ? "#fff" : "var(--v4-text-tertiary)",
                          opacity: active ? 0.8 : 1,
                        }}
                      >
                        {cnt}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <span
            style={{
              width: 1,
              height: 14,
              background: "var(--v4-border-secondary)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--v4-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              담당자
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {assigneeOptions.map((name) => {
                const active = assignee === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setAssignee(name)}
                    style={{
                      fontSize: 11.5,
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid transparent",
                      background: active ? "var(--v4-text-primary)" : "transparent",
                      color: active ? "#fff" : "var(--v4-text-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 260px",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: task sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {showNow && nowList.length > 0 && (
              <TaskSection
                title="지금 바로 처리"
                count={nowList.length}
                tone="danger"
              >
                {nowList.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    tone="danger"
                    onOpen={handleOpen}
                    onCall={handleCall}
                    onSms={handleSms}
                    hideComplex={selectedComplex !== ALL_COMPLEXES}
                  />
                ))}
              </TaskSection>
            )}

            {showInbox && (
              <TaskSection
                title="신규 · 미상담"
                count={inboxList.length}
                tone="warning"
                emptyLabel="신규 접수 건이 없습니다."
              >
                {inboxList.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    tone="warning"
                    onOpen={handleOpen}
                    onCall={handleCall}
                    onSms={handleSms}
                    hideComplex={selectedComplex !== ALL_COMPLEXES}
                  />
                ))}
              </TaskSection>
            )}

            {showToday && (
              <TaskSection
                title="오늘 중 처리"
                count={todayList.length}
                tone="info"
                emptyLabel="오늘 예정된 작업이 없습니다."
              >
                {todayList.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    tone="info"
                    onOpen={handleOpen}
                    hideComplex={selectedComplex !== ALL_COMPLEXES}
                  />
                ))}
              </TaskSection>
            )}

            {showSigning && (
              <TaskSection
                title="자서예약 명단"
                count={signingList.length}
                tone="info"
                emptyLabel="자서 예약 건이 없습니다."
              >
                {signingList.map((t) => (
                  <DetailTaskRow
                    key={t.id}
                    task={t}
                    variant="signing"
                    onOpen={handleOpen}
                  />
                ))}
              </TaskSection>
            )}

            {showExecution && (
              <TaskSection
                title="실행예정 명단"
                count={executionList.length}
                tone="success"
                emptyLabel="실행 예정 건이 없습니다."
              >
                {executionList.map((t) => (
                  <DetailTaskRow
                    key={t.id}
                    task={t}
                    variant="execution"
                    onOpen={handleOpen}
                  />
                ))}
              </TaskSection>
            )}
          </div>

          {/* RIGHT: sidebar */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              position: "sticky",
              top: 70,
              paddingLeft: 18,
              borderLeft: "1px solid var(--v4-border-secondary)",
            }}
          >
            <InterventionQueue
              tasks={filteredAll}
              isInactive={() => false}
              onSelectTask={(t) => handleOpen(t.id)}
            />
            <UpcomingList items={upcomingList} onOpen={handleOpen} />
            <WeekMini events={weekEvents} />
            <CapacityCard
              approvalNo="승인번호 1132500000010"
              usedBillion={32.67}
              totalBillion={200}
              monthly={monthly}
              defaultCollapsed
            />
            <RecentActivity items={activity} />
          </aside>
        </div>
      </div>
      {signingModalOpen ? (
        <SigningListModal
          items={filteredAll.filter((t) => isSigningTag(t.tag))}
          onClose={() => setSigningModalOpen(false)}
          onRowClick={(id) => {
            setSigningModalOpen(false);
            navigate(`/v4/wizard/signing/${id}`);
          }}
        />
      ) : null}
      {reportModalOpen ? (
        <IntegratedReportModal
          items={filteredAll}
          complex={
            selectedComplex === ALL_COMPLEXES ? "전체 아파트" : selectedComplex
          }
          onClose={() => setReportModalOpen(false)}
          onRowClick={(id) => {
            setReportModalOpen(false);
            navigate(`/v4/wizard/execution/${id}`);
          }}
        />
      ) : null}
      {consultationListOpen ? (
        <ConsultationListModal
          items={filteredAll}
          onClose={() => setConsultationListOpen(false)}
          onRowClick={(id, stage) => {
            setConsultationListOpen(false);
            const route =
              stage === "signing"
                ? "signing"
                : stage === "execution"
                ? "execution"
                : "consultation";
            navigate(`/v4/wizard/${route}/${id}`);
          }}
        />
      ) : null}
      {monthlyOpen ? (
        <MonthlyPerformanceModal
          items={filteredAll}
          onClose={() => setMonthlyOpen(false)}
        />
      ) : null}
      {pipelineOpen ? (
        <PipelineOverviewModal
          items={
            myAssignee
              ? filteredAll.filter((t) => t.assignee === myAssignee)
              : filteredAll
          }
          scopeLabel={myAssignee ? `내 담당 (${myAssignee})` : "내 담당"}
          onClose={() => setPipelineOpen(false)}
        />
      ) : null}
      {newCustomerOpen ? (
        <NewCustomerModal
          complexes={complexes}
          defaultComplex={
            selectedComplex === ALL_COMPLEXES ? complexes[0] : selectedComplex
          }
          onClose={() => setNewCustomerOpen(false)}
          onSubmit={async (data: NewCustomerData) => {
            setNewCustomerOpen(false);
            try {
              const created = await api.createBankConsultation({
                resident_name: data.customerName,
                resident_phone: data.phone,
                complex_name: data.complex || undefined,
                dong: data.dong || undefined,
                ho: data.ho || undefined,
                apt_type: data.size ? `${data.size}` : undefined,
                loan_amount: data.loanAmount
                  ? Number(data.loanAmount.replace(/[^0-9]/g, ""))
                  : undefined,
                memo: [data.source ? `유입경로: ${data.source}` : "", data.note]
                  .filter(Boolean)
                  .join("\n") || undefined,
              });
              navigate(`/v4/wizard/consultation/${created.id}`);
            } catch (e) {
              console.warn("[Home:createBankConsultation]", e);
              window.alert("신규 고객 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
          }}
        />
      ) : null}
      {addComplexOpen ? (
        <AddComplexModal
          existing={complexes}
          onClose={() => setAddComplexOpen(false)}
          onSubmit={(name) => {
            setComplexes((prev) => [...prev, name]);
            setSelectedComplex(name);
            setAddComplexOpen(false);
          }}
        />
      ) : null}
    </AppShell>
  );
}
