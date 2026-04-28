import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Inbox as InboxIcon,
  Building2,
  ChevronDown,
  Search,
  X,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDemoAssigneeName, parseBankLoginId, MANAGER_ASSIGNEE_NAME } from "../auth/role";
import { logImpersonation } from "../data/impersonationLog";
import { UserMenu } from "../auth/UserMenu";
import { AppShell } from "../layout/AppShell";
import { InboxRow } from "../inbox/InboxRow";
import { InboxDetail } from "../inbox/InboxDetail";
import { CompletedDetail } from "../inbox/CompletedDetail";
import { InboxEmpty } from "../inbox/InboxEmpty";
import { StageTimeline, type TimelineStage } from "../inbox/StageTimeline";
import ConsultationWizard from "./ConsultationWizard";
import ReservationWizard from "./ReservationWizard";
import SigningWizard from "./SigningWizard";
import ExecutionWizard from "./ExecutionWizard";
import { useInboxKeyboard } from "../inbox/useInboxKeyboard";
import { HeaderActions } from "../home/HeaderActions";
import NotificationBell from "../home/NotificationBell";
import { SigningListModal } from "../home/SigningListModal";
import { IntegratedReportModal } from "../home/IntegratedReportModal";
import { ConsultationListModal } from "../home/ConsultationListModal";
import { MonthlyPerformanceModal } from "../home/MonthlyPerformanceModal";
import { NewCustomerModal, type NewCustomerData } from "../home/NewCustomerModal";
import { AddComplexModal } from "../home/AddComplexModal";
import {
  ALL_COMPLEXES,
  ADD_COMPLEX_SENTINEL,
  DEFAULT_COMPLEXES,
  STORAGE_KEY,
  COMPLEXES_STORAGE_KEY,
  getComplexFromAddress,
} from "../data/samples";
import { useMyConsultations } from "../data/useConsultations";
import { api } from "@/lib/api";
import type { TaskItem } from "../home/TaskRow";
import type { UrgencyLevel } from "@/lib/urgency";

type CategoryKey =
  | "all"
  | "inbox"
  | "today"
  | "reservation"
  | "signing"
  | "execution"
  | "done";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "inbox", label: "신규·미상담" },
  { key: "today", label: "오늘" },
  { key: "reservation", label: "예약" },
  { key: "signing", label: "자서" },
  { key: "execution", label: "실행" },
  { key: "done", label: "완료" },
];

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  critical: 0,
  urgent: 1,
  warning: 2,
  normal: 3,
};

const TODAY_KEY = new Date().toISOString().slice(0, 10);
const DONE_STORAGE_KEY = `v4.inbox.done.${TODAY_KEY}`;

// "오늘" 카테고리: execution_date 또는 signing_date 가 오늘인 건.
const isToday = (task: TaskItem) =>
  task.executionDate === TODAY_KEY || task.signingDate === TODAY_KEY;

const ALL_ASSIGNEE = "전체";

const isReservationTag = (tag?: string) => tag === "예약" || tag === "자서예약";
const isSigningTag = (tag?: string) => tag === "자서" || tag === "지연";
const isExecutionTag = (tag?: string) => tag === "실행";
const isInboxTag = (tag?: string) =>
  tag === "신규" || tag === "미상담" || tag === "재연락";

// 자서일이 지났는지 판정 (today > signingDate). 자서예약 → 자서 위저드 자동 전환에 사용.
const isSigningDatePassed = (signingDate?: string) => {
  if (!signingDate) return false;
  const sd = new Date(signingDate);
  if (Number.isNaN(sd.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sd.setHours(0, 0, 0, 0);
  return today.getTime() > sd.getTime();
};

type Stage = "inbox" | "reservation" | "signing" | "execution";

// tag + signingDate를 종합해 실제 단계를 판정. 카테고리 필터/카운트/위저드 라우팅 모두 이 함수 기준.
const effectiveStage = (task: TaskItem): Stage | null => {
  const tag = task.tag;
  if (isInboxTag(tag)) return "inbox";
  if (isReservationTag(tag)) {
    return isSigningDatePassed(task.signingDate) ? "signing" : "reservation";
  }
  if (tag === "지연") {
    // 지연 태그는 데이터 필드로 단계 추론: checkpoints/fundsAmount → 실행지연, 그 외 → 자서지연
    if (task.checkpoints || task.fundsAmount) return "execution";
    return "signing";
  }
  if (isSigningTag(tag)) return "signing";
  if (isExecutionTag(tag)) return "execution";
  return null;
};

// Map<id, completedAt(ms)>. 구버전(string[])과 호환.
function loadDone(): Map<string, number> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(DONE_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 구버전: ["id1","id2"] → 타임스탬프 모름, 0으로 기록
      // 신버전: [["id1", 1714000000000], ...]
      const m = new Map<string, number>();
      for (const item of parsed) {
        if (typeof item === "string") m.set(item, 0);
        else if (Array.isArray(item) && typeof item[0] === "string") {
          m.set(item[0], typeof item[1] === "number" ? item[1] : 0);
        }
      }
      return m;
    }
  } catch {
    /* noop */
  }
  return new Map();
}


function wizardPathFor(task: TaskItem | undefined): string | null {
  if (!task) return null;
  const stage = effectiveStage(task);
  switch (stage) {
    case "inbox":
      return `/v4/wizard/consultation/${task.id}`;
    case "reservation":
      return `/v4/wizard/reservation/${task.id}`;
    case "signing":
      return `/v4/wizard/signing/${task.id}`;
    case "execution":
      return `/v4/wizard/execution/${task.id}`;
    default:
      return `/v4/wizard/execution/${task.id}`;
  }
}

export default function HomeInbox() {
  const { bankName, loginId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const display = bankName || "국민은행";

  const { tasks: apiTasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useMyConsultations();
  const ALL_SORTED = useMemo(
    () => [...apiTasks].sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]),
    [apiTasks]
  );

  const myAssignee = getDemoAssigneeName(loginId);
  const parsedAccount = parseBankLoginId(loginId);
  const managerDrillAssignee =
    parsedAccount?.role === "manager"
      ? searchParams.get("assignee") || null
      : null;
  // 팀장이 본인("팀장")으로 필터링 접근하는 것은 대리 접속이 아닌 단순 본인 뷰
  const impersonating =
    !!managerDrillAssignee && managerDrillAssignee !== MANAGER_ASSIGNEE_NAME;
  const effectiveAssignee = myAssignee ?? managerDrillAssignee;
  const lockAssignee = !!effectiveAssignee;

  const category = (searchParams.get("category") as CategoryKey) || "all";
  const assignee = lockAssignee
    ? (effectiveAssignee as string)
    : searchParams.get("assignee") || ALL_ASSIGNEE;
  const selectedId = searchParams.get("selected");

  const [done, setDone] = useState<Map<string, number>>(() => loadDone());
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // 우측 패널에서 타임라인으로 이전 단계 조회 중일 때의 override.
  // selectedId가 바뀌면 자동으로 재설정.
  const [viewStageOverride, setViewStageOverride] = useState<TimelineStage | null>(null);
  useEffect(() => {
    setViewStageOverride(null);
  }, [selectedId]);

  useEffect(() => {
    if (impersonating && loginId && managerDrillAssignee) {
      logImpersonation(loginId, managerDrillAssignee);
    }
  }, [impersonating, loginId, managerDrillAssignee]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.tagName === "SELECT" ||
          tgt.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [consultationListOpen, setConsultationListOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [addComplexOpen, setAddComplexOpen] = useState(false);

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
        /* noop */
      }
    }
    return DEFAULT_COMPLEXES;
  });

  const [selectedComplex, setSelectedComplex] = useState<string>(() => {
    if (typeof window === "undefined") return ALL_COMPLEXES;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored || ALL_COMPLEXES;
  });

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DONE_STORAGE_KEY, JSON.stringify(Array.from(done.entries())));
  }, [done]);

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
    ALL_SORTED.forEach((t) => {
      if (t.assignee) set.add(t.assignee);
    });
    return [ALL_ASSIGNEE, ...Array.from(set).sort()];
  }, [ALL_SORTED]);

  const byAssignee = (t: TaskItem) =>
    assignee === ALL_ASSIGNEE ? true : t.assignee === assignee;
  const byComplex = (t: TaskItem) =>
    selectedComplex === ALL_COMPLEXES
      ? true
      : getComplexFromAddress(t.addressLabel) === selectedComplex;
  const matches = (t: TaskItem) => byAssignee(t) && byComplex(t);

  const filteredBase = useMemo(() => ALL_SORTED.filter(matches), [ALL_SORTED, assignee, selectedComplex]);

  const trimmedQuery = query.trim().toLowerCase();
  const byQuery = (t: TaskItem) => {
    if (!trimmedQuery) return true;
    const hay = [
      t.customerName,
      t.addressLabel,
      t.assignee,
      t.phone,
      ...(t.phones ?? []),
      t.tag,
      t.nextAction,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(trimmedQuery);
  };

  const filteredList = useMemo(() => {
    const byCategory = (() => {
      switch (category) {
        case "inbox":
          return filteredBase.filter((t) => effectiveStage(t) === "inbox");
        case "today":
          return filteredBase.filter((t) => isToday(t));
        case "reservation":
          return filteredBase.filter((t) => effectiveStage(t) === "reservation");
        case "signing":
          return filteredBase.filter((t) => effectiveStage(t) === "signing");
        case "execution":
          return filteredBase.filter((t) => effectiveStage(t) === "execution");
        case "done":
          // 대출 실행 완료 (backend loan_status=done) — localStorage 체크박스 아님
          return filteredBase.filter((t) => t.tag === "완료");
        default:
          return filteredBase;
      }
    })();
    return byCategory.filter(byQuery);
  }, [category, filteredBase, done, trimmedQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: filteredBase.length,
      inbox: filteredBase.filter((t) => effectiveStage(t) === "inbox").length,
      today: filteredBase.filter((t) => isToday(t)).length,
      reservation: filteredBase.filter((t) => effectiveStage(t) === "reservation").length,
      signing: filteredBase.filter((t) => effectiveStage(t) === "signing").length,
      execution: filteredBase.filter((t) => effectiveStage(t) === "execution").length,
      done: filteredBase.filter((t) => t.tag === "완료").length,
    } as Record<CategoryKey, number>;
  }, [filteredBase]);

  const selectedTask = useMemo(
    () => (selectedId ? ALL_SORTED.find((t) => t.id === selectedId) : undefined),
    [ALL_SORTED, selectedId]
  );

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete(key);
    else params.set(key, value);
    setSearchParams(params, { replace: true });
  };

  const setCategory = (next: CategoryKey) =>
    updateParam("category", next === "all" ? null : next);
  const setAssignee = (next: string) =>
    updateParam("assignee", next === ALL_ASSIGNEE ? null : next);
  const setSelected = (id: string | null) => updateParam("selected", id);

  const moveSelection = (delta: 1 | -1) => {
    if (filteredList.length === 0) return;
    const idx = selectedId ? filteredList.findIndex((t) => t.id === selectedId) : -1;
    const nextIdx =
      idx === -1
        ? delta === 1
          ? 0
          : filteredList.length - 1
        : Math.min(filteredList.length - 1, Math.max(0, idx + delta));
    const next = filteredList[nextIdx];
    if (next) setSelected(next.id);
  };

  const toggleDone = (id?: string | null) => {
    if (!id) return;
    setDone((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, Date.now());
      return next;
    });
  };

  const callTask = (task?: TaskItem) => {
    const num = (task?.phones?.[0] ?? task?.phone)?.replace(/-/g, "");
    if (num) window.open(`tel:${num}`);
  };
  const smsTask = (task?: TaskItem) => {
    const num = (task?.phones?.[0] ?? task?.phone)?.replace(/-/g, "");
    if (num) window.open(`sms:${num}`);
  };
  const openWizard = (task?: TaskItem) => {
    const path = wizardPathFor(task);
    if (path) navigate(path);
  };

  useInboxKeyboard({
    onNext: () => moveSelection(1),
    onPrev: () => moveSelection(-1),
    onOpen: () => openWizard(selectedTask),
    onComplete: () => toggleDone(selectedTask?.id),
    onSms: () => smsTask(selectedTask),
    onCall: () => callTask(selectedTask),
    onEscape: () => setSelected(null),
  });

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "var(--v4-bg-primary)",
        }}
      >
        {impersonating ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 18px",
              fontSize: 11.5,
              background: "var(--v4-bg-warning)",
              color: "var(--v4-text-warning)",
              borderBottom: "1px solid var(--v4-border-warning, var(--v4-border-light))",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/v4/team")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 500,
                color: "inherit",
                background: "transparent",
                border: "1px solid currentColor",
                borderRadius: 4,
                padding: "3px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <ArrowLeft size={11} strokeWidth={2} />
              팀 현황으로
            </button>
            <span>
              <b style={{ fontWeight: 600 }}>{managerDrillAssignee}</b> 계정으로 대리 접속 중 —
              변경 사항은 담당자 본인이 작업한 것과 동일하게 반영됩니다
            </span>
          </div>
        ) : null}

        {/* Top action bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 18px",
            borderBottom: "1px solid var(--v4-border-light)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              className="v4-panel-icon"
              style={{ background: "var(--v4-bg-info)", color: "var(--v4-info)" }}
            >
              <InboxIcon size={13} strokeWidth={2} />
            </span>
            <h1
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--v4-text-primary)",
                letterSpacing: "-0.2px",
                margin: 0,
              }}
            >
              오늘의 인박스
            </h1>
            <span
              className="v4-tabular"
              style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}
            >
              {categoryCounts.all}건
            </span>

            {/* Complex selector pill + add button */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
              <label
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 24px 4px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--v4-text-info)",
                  background: "var(--v4-bg-info)",
                  border: "1px solid var(--v4-border-info)",
                  borderRadius: 999,
                  cursor: "pointer",
                  lineHeight: 1.2,
                }}
                title="아파트 선택"
              >
                <Building2 size={12} strokeWidth={2} />
                {selectedComplex}
                <ChevronDown
                  size={11}
                  strokeWidth={2}
                  style={{
                    position: "absolute",
                    right: 7,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <select
                  value={selectedComplex}
                  onChange={(e) => handleComplexChange(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    border: 0,
                  }}
                >
                  {complexOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setAddComplexOpen(true)}
                title="아파트 추가"
                aria-label="아파트 추가"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  border: "1px dashed var(--v4-border-primary)",
                  background: "transparent",
                  color: "var(--v4-text-tertiary)",
                  borderRadius: 999,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Plus size={12} strokeWidth={2} />
              </button>
            </div>

            <span
              style={{
                fontSize: 11,
                color: "var(--v4-text-tertiary)",
                marginLeft: 4,
                paddingLeft: 8,
                borderLeft: "1px solid var(--v4-border-light)",
              }}
            >
              {display}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <NotificationBell
              tasks={filteredBase}
              onSelect={(taskId) => setSelected(taskId)}
            />
            <HeaderActions
              onAction={(key) => {
                if (key === "new") setNewCustomerOpen(true);
                else if (key === "signing") setSigningModalOpen(true);
                else if (key === "print") setReportModalOpen(true);
                else if (key === "list") setConsultationListOpen(true);
                else if (key === "monthly") setMonthlyOpen(true);
                else if (key === "complex") navigate("/v4/complex-templates");
                else if (key === "bankProfile") navigate("/v4/bank-profile");
              }}
            />
            <UserMenu impersonatingAs={impersonating ? managerDrillAssignee : null} />
          </div>
        </div>

        {/* Filter row — 보기 / 담당자 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "8px 18px",
            borderBottom: "1px solid var(--v4-border-light)",
            flexShrink: 0,
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
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
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
            {lockAssignee ? (
              <span
                title={
                  impersonating
                    ? "팀장이 해당 상담사 계정으로 대리 접속 중입니다"
                    : "내 담당 고객만 표시됩니다"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11.5,
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: impersonating ? "var(--v4-bg-warning)" : "var(--v4-bg-info)",
                  color: impersonating ? "var(--v4-text-warning)" : "var(--v4-text-info)",
                  border: `1px solid ${impersonating ? "var(--v4-border-warning)" : "var(--v4-border-info)"}`,
                  fontWeight: 500,
                }}
              >
                {effectiveAssignee}
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  · {impersonating ? "대리 접속" : "내 담당"}
                </span>
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
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
            )}
          </div>

          {/* Search */}
          <div
            style={{
              marginLeft: "auto",
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Search
              size={12}
              strokeWidth={2}
              style={{
                position: "absolute",
                left: 9,
                color: "var(--v4-text-tertiary)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (query) {
                    setQuery("");
                  } else {
                    (e.target as HTMLInputElement).blur();
                  }
                }
              }}
              placeholder="검색 (이름·전화·동호수)"
              style={{
                width: 220,
                padding: "5px 28px 5px 26px",
                fontSize: 11.5,
                color: "var(--v4-text-primary)",
                background: "var(--v4-bg-secondary)",
                border: "1px solid var(--v4-border-light)",
                borderRadius: 6,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="지우기"
                style={{
                  position: "absolute",
                  right: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  border: "none",
                  background: "transparent",
                  color: "var(--v4-text-tertiary)",
                  cursor: "pointer",
                  borderRadius: 3,
                }}
              >
                <X size={11} strokeWidth={2} />
              </button>
            ) : (
              <kbd
                className="v4-kbd"
                style={{
                  position: "absolute",
                  right: 6,
                  fontSize: 9.5,
                }}
              >
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Two-pane body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(340px, 400px) minmax(0, 1fr)",
          }}
        >
          {/* LEFT: list pane */}
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid var(--v4-border-secondary)",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, overflowY: "auto" }}>
              {tasksLoading ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--v4-text-tertiary)",
                    fontSize: 12,
                  }}
                >
                  불러오는 중…
                </div>
              ) : tasksError ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--v4-danger)",
                    fontSize: 12,
                  }}
                >
                  {tasksError}
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => refetchTasks()}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        border: "1px solid var(--v4-border-secondary)",
                        background: "transparent",
                        borderRadius: 4,
                        cursor: "pointer",
                        color: "var(--v4-text-secondary)",
                      }}
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : filteredList.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--v4-text-tertiary)",
                    fontSize: 12,
                  }}
                >
                  해당 항목이 없습니다.
                </div>
              ) : (
                filteredList.map((task) => (
                  <InboxRow
                    key={task.id}
                    task={task}
                    selected={selectedId === task.id}
                    done={done.has(task.id)}
                    onClick={() => setSelected(task.id)}
                  />
                ))
              )}
            </div>
          </section>

          {/* RIGHT: detail pane */}
          <section
            style={{
              minWidth: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {selectedTask ? (
              (() => {
                const onEmbedComplete = () => {
                  toggleDone(selectedTask.id);
                  setSelected(null);
                  refetchTasks();
                };
                // 현재 단계와 보기 단계 결정. 완료 태그면 currentStage='completed'.
                const currentStage: TimelineStage =
                  selectedTask.tag === "완료"
                    ? "completed"
                    : (effectiveStage(selectedTask) ?? "inbox");
                const viewStage: TimelineStage = viewStageOverride ?? currentStage;

                const reopen = async () => {
                  const ok = window.confirm(
                    `${selectedTask.customerName} 건을 실행 단계로 되돌립니다.\n계속할까요?`
                  );
                  if (!ok) return;
                  try {
                    await api.updateBankStatus(selectedTask.id, "executing");
                    refetchTasks();
                  } catch (e) {
                    console.warn("[reopen]", e);
                  }
                };

                const renderBody = () => {
                  if (viewStage === "completed") {
                    return (
                      <CompletedDetail
                        key={selectedTask.id}
                        embed
                        task={selectedTask}
                        completedAt={done.get(selectedTask.id)}
                        completedBy={effectiveAssignee ?? undefined}
                        onUndoComplete={reopen}
                        onCall={() => callTask(selectedTask)}
                        onSms={() => smsTask(selectedTask)}
                      />
                    );
                  }
                  if (viewStage === "inbox") {
                    return (
                      <ConsultationWizard
                        key={`${selectedTask.id}-${viewStage}`}
                        embed
                        embedId={selectedTask.id}
                        embedTask={selectedTask}
                        onEmbedComplete={onEmbedComplete}
                      />
                    );
                  }
                  if (viewStage === "reservation") {
                    return (
                      <ReservationWizard
                        key={`${selectedTask.id}-${viewStage}`}
                        embed
                        embedId={selectedTask.id}
                        embedTask={selectedTask}
                        onEmbedComplete={onEmbedComplete}
                      />
                    );
                  }
                  if (viewStage === "signing") {
                    return (
                      <SigningWizard
                        key={`${selectedTask.id}-${viewStage}`}
                        embed
                        embedId={selectedTask.id}
                        embedTask={selectedTask}
                        onEmbedComplete={onEmbedComplete}
                      />
                    );
                  }
                  if (viewStage === "execution") {
                    return (
                      <ExecutionWizard
                        key={`${selectedTask.id}-${viewStage}`}
                        embedded
                        idProp={selectedTask.id}
                        embedTask={selectedTask}
                        onComplete={onEmbedComplete}
                      />
                    );
                  }
                  return (
                    <InboxDetail
                      task={selectedTask}
                      done={done.has(selectedTask.id)}
                      onOpenWizard={() => openWizard(selectedTask)}
                      onSms={() => smsTask(selectedTask)}
                      onCall={() => callTask(selectedTask)}
                      onComplete={() => toggleDone(selectedTask.id)}
                    />
                  );
                };

                return (
                  <>
                    <StageTimeline
                      currentStage={currentStage}
                      viewStage={viewStage}
                      onJump={(s) =>
                        setViewStageOverride(s === currentStage ? null : s)
                      }
                    />
                    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                      {renderBody()}
                    </div>
                  </>
                );
              })()
            ) : (
              <InboxEmpty />
            )}
          </section>
        </div>
      </div>

      {signingModalOpen ? (
        <SigningListModal
          items={filteredBase.filter((t) => effectiveStage(t) === "signing")}
          onClose={() => setSigningModalOpen(false)}
          onRowClick={(id) => {
            setSigningModalOpen(false);
            navigate(`/v4/wizard/signing/${id}`);
          }}
        />
      ) : null}
      {reportModalOpen ? (
        <IntegratedReportModal
          items={filteredBase}
          complex={selectedComplex === ALL_COMPLEXES ? "전체 아파트" : selectedComplex}
          onClose={() => setReportModalOpen(false)}
          onRowClick={(id) => {
            setReportModalOpen(false);
            navigate(`/v4/wizard/execution/${id}`);
          }}
        />
      ) : null}
      {consultationListOpen ? (
        <ConsultationListModal
          items={filteredBase}
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
          items={filteredBase}
          onClose={() => setMonthlyOpen(false)}
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
              await refetchTasks();
              // 풀스크린 위저드로 안 보내고 인박스 우측 패널에서 바로 상담 입력하도록.
              // 신규-미상담(inbox) 카테고리로 전환해야 새로 들어온 행이 좌측 리스트에 보임.
              setCategory("inbox");
              setSelected(created.id);
            } catch (e) {
              console.warn("[createBankConsultation]", e);
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
