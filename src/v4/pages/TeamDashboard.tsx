import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ChevronRight,
  ChevronDown,
  Building2,
  Clock,
  UserPlus,
  UserMinus,
  UserCheck,
  Plus,
  RotateCcw,
  List,
  Calendar,
  FileText,
  Layers,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MANAGER_ASSIGNEE_NAME } from "../auth/role";
import { AppShell } from "../layout/AppShell";
import {
  ALL_COMPLEXES,
  ADD_COMPLEX_SENTINEL,
  DEFAULT_COMPLEXES,
  COMPLEXES_STORAGE_KEY,
  STORAGE_KEY,
  getComplexFromAddress,
} from "../data/samples";
import { useMyConsultations } from "../data/useConsultations";
import { api } from "@/lib/api";
import { AddComplexModal } from "../home/AddComplexModal";
import type { TaskItem } from "../home/TaskRow";
import { UserMenu } from "../auth/UserMenu";
import { useReassignments, getEffectiveAssignee } from "../data/reassignments";
import { useInactiveConsultants } from "../data/inactiveConsultants";
import { TeamCalendar } from "../team/TeamCalendar";
import { DeactivateConsultantModal } from "../team/DeactivateConsultantModal";
import { InterventionQueue } from "../team/InterventionQueue";
import { MonthlyPerformancePanel } from "../team/MonthlyPerformancePanel";
import { TodayTimeline } from "../team/TodayTimeline";
import { NewCustomerModal, type NewCustomerData } from "../home/NewCustomerModal";
import { ConsultationListModal } from "../home/ConsultationListModal";
import { SigningListModal } from "../home/SigningListModal";
import { RepaymentEmbedModal } from "../team/RepaymentEmbedModal";
import { PipelineOverviewModal } from "../team/PipelineOverviewModal";
import { MonthlyPerformanceModal } from "../home/MonthlyPerformanceModal";
import { ComplexBankInlineEdit } from "../bankprofile/ComplexBankInlineEdit";

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

function isRisky(t: TaskItem): boolean {
  if (t.tag === "지연") return true;
  if (t.urgency === "critical") return true;
  return false;
}

function wizardPathFor(task: TaskItem): string {
  const tag = task.tag ?? "";
  if (tag === "자서" || tag === "지연") return `/v4/wizard/signing/${task.id}`;
  if (tag === "실행") return `/v4/wizard/execution/${task.id}`;
  return `/v4/wizard/consultation/${task.id}`;
}

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KR[d.getDay()]})`;
}

function loadComplexes(): string[] {
  if (typeof window === "undefined") return DEFAULT_COMPLEXES;
  try {
    const raw = window.localStorage.getItem(COMPLEXES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((c) => typeof c === "string" && c.trim())) {
        return parsed;
      }
    }
  } catch {
    /* noop */
  }
  return DEFAULT_COMPLEXES;
}

export default function TeamDashboard() {
  const { bankName } = useAuth();
  const navigate = useNavigate();
  const displayBank = bankName || "국민은행";

  // 팀장은 본인 vendor_name 의 모든 상담 건을 받아옴 (백엔드 controller 분기 처리).
  // useMyConsultations 가 10초 폴링 + 탭 가시성 동기화를 포함하므로
  // 상담사가 신규 등록한 건이 자동으로 팀장 화면에 반영된다.
  const { tasks: apiTasks, refetch: refetchTasks } = useMyConsultations();

  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [bankInfoEditOpen, setBankInfoEditOpen] = useState(false);
  const [consultationListOpen, setConsultationListOpen] = useState(false);
  const [signingOpen, setSigningOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [complexes, setComplexes] = useState<string[]>(() => loadComplexes());
  const [addComplexOpen, setAddComplexOpen] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<string>(() => {
    if (typeof window === "undefined") return ALL_COMPLEXES;
    return window.localStorage.getItem(STORAGE_KEY) || ALL_COMPLEXES;
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
    if (selectedComplex !== ALL_COMPLEXES && !complexes.includes(selectedComplex)) {
      setSelectedComplex(ALL_COMPLEXES);
    }
  }, [complexes, selectedComplex]);

  const handleComplexChange = (v: string) => {
    if (v === ADD_COMPLEX_SENTINEL) {
      setAddComplexOpen(true);
      return;
    }
    setSelectedComplex(v);
  };
  const { map: reassignMap, reassign, clearAssignment } = useReassignments();
  const { isInactive, deactivate, reactivate, inactiveList } = useInactiveConsultants();
  const [deactivateFor, setDeactivateFor] = useState<string | null>(null);

  const allMemberNames = useMemo(() => {
    const set = new Set<string>();
    apiTasks.forEach((t) => {
      if (t.assignee?.trim()) set.add(t.assignee.trim());
    });
    Object.values(reassignMap).forEach((name) => {
      if (name?.trim()) set.add(name.trim());
    });
    return Array.from(set).sort();
  }, [apiTasks, reassignMap]);

  // 비활성 상담사는 신규 배정 드롭다운에서 숨김. "팀장"(직접 처리)은 항상 노출.
  const teamMembers = useMemo(
    () =>
      allMemberNames.filter((n) => n === MANAGER_ASSIGNEE_NAME || !isInactive(n)),
    [allMemberNames, isInactive],
  );

  const assignSelfReassign = (taskId: string) =>
    reassign(taskId, MANAGER_ASSIGNEE_NAME);

  const effectiveTasks = useMemo(
    () =>
      apiTasks.map((t) => ({
        ...t,
        assignee: getEffectiveAssignee(t, reassignMap),
      })),
    [apiTasks, reassignMap],
  );

  const handleDeactivateConfirm = (reassignTarget: string | null) => {
    const target = deactivateFor;
    if (!target) return;
    if (reassignTarget) {
      effectiveTasks.forEach((t) => {
        if (t.assignee === target) reassign(t.id, reassignTarget);
      });
    }
    deactivate(target);
    setDeactivateFor(null);
  };

  const scopedTasks = useMemo(() => {
    if (selectedComplex === ALL_COMPLEXES) return effectiveTasks;
    return effectiveTasks.filter(
      (t) => getComplexFromAddress(t.addressLabel) === selectedComplex,
    );
  }, [effectiveTasks, selectedComplex]);

  const originalAssigneeById = useMemo(() => {
    const m = new Map<string, string>();
    apiTasks.forEach((t) => {
      if (t.assignee?.trim()) m.set(t.id, t.assignee.trim());
    });
    return m;
  }, [apiTasks]);

  const kpi = useMemo(() => {
    return {
      signingToday: scopedTasks.filter((t) => t.tag === "자서").length,
      executionToday: scopedTasks.filter((t) => t.tag === "실행").length,
    };
  }, [scopedTasks]);

  const memberRows = useMemo(() => {
    const byAssignee = new Map<string, TaskItem[]>();
    scopedTasks.forEach((t) => {
      const name = t.assignee?.trim();
      if (!name) return;
      if (!byAssignee.has(name)) byAssignee.set(name, []);
      byAssignee.get(name)!.push(t);
    });
    // 비활성 상담사라도 담당 고객이 남아 있으면 행은 노출 (재배정 유도)
    inactiveList.forEach((n) => {
      if (!byAssignee.has(n)) byAssignee.set(n, []);
    });
    return Array.from(byAssignee.entries())
      .map(([name, tasks]) => ({
        name,
        total: tasks.length,
        inbox: tasks.filter((t) => t.tag === "신규" || t.tag === "미상담").length,
        signing: tasks.filter((t) => t.tag === "자서").length,
        execution: tasks.filter((t) => t.tag === "실행").length,
        delayed: tasks.filter((t) => t.tag === "지연").length,
        risky: tasks.filter(isRisky).length,
        inactive: isInactive(name),
      }))
      .sort((a, b) => {
        if (a.inactive !== b.inactive) return a.inactive ? 1 : -1;
        return b.risky - a.risky || b.total - a.total;
      });
  }, [scopedTasks, inactiveList, isInactive]);

  const newIntakeItems = useMemo(
    () => scopedTasks.filter((t) => t.tag === "신규" || t.tag === "미상담"),
    [scopedTasks],
  );

  const maxMemberLoad = useMemo(
    () => memberRows.reduce((max, r) => Math.max(max, r.total), 0),
    [memberRows],
  );

  const overloadedAssignees = useMemo(() => {
    const set = new Set<string>();
    memberRows.forEach((r) => {
      if (r.signing + r.execution >= 3 || r.total >= 6) set.add(r.name);
    });
    return set;
  }, [memberRows]);

  type ReassignTagInfo = {
    label: string;
    tone: "danger" | "warning";
  } | null;
  const reassignTagFor = (t: TaskItem): ReassignTagInfo => {
    const owner = (t.assignee ?? "").trim();
    if (!owner) return null;
    if (isInactive(owner)) return { label: "재배정 필요", tone: "danger" };
    if (overloadedAssignees.has(owner))
      return { label: "재배정 검토", tone: "warning" };
    return null;
  };

  const gotoConsultant = (name: string) => {
    navigate(`/v4?assignee=${encodeURIComponent(name)}`);
  };
  const openTask = (task: TaskItem) => navigate(wizardPathFor(task));

  return (
    <AppShell>
      <div
        style={{
          height: "100vh",
          padding: "12px 20px",
          background: "var(--v4-bg-primary)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflow: "hidden",
        }}
      >
        {/* Header (compact, single row) */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Users size={14} strokeWidth={2} style={{ color: "var(--v4-text-tertiary)" }} />
            <h1
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--v4-text-primary)",
                letterSpacing: "-0.2px",
                margin: 0,
              }}
            >
              {displayBank} · 오늘의 팀 현황
            </h1>
            <span
              className="v4-tabular"
              style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}
            >
              {formatToday()}
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <label
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 22px 3px 10px",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "var(--v4-text-info)",
                  background: "var(--v4-bg-info)",
                  border: "1px solid var(--v4-border-info)",
                  borderRadius: 999,
                  cursor: "pointer",
                  lineHeight: 1.2,
                }}
                title="아파트 필터"
              >
                <Building2 size={11} strokeWidth={2} />
                {selectedComplex}
                <ChevronDown
                  size={10}
                  strokeWidth={2}
                  style={{
                    position: "absolute",
                    right: 6,
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
                  <option value={ALL_COMPLEXES}>{ALL_COMPLEXES}</option>
                  {complexes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={ADD_COMPLEX_SENTINEL}>{ADD_COMPLEX_SENTINEL}</option>
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
                  width: 22,
                  height: 22,
                  border: "1px dashed var(--v4-border-primary)",
                  background: "transparent",
                  color: "var(--v4-text-tertiary)",
                  borderRadius: 999,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Plus size={11} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* 단지 선택된 상태에서만 [✏️ 단지 안내글 편집] 버튼 노출 — 페이지 이동 없이 모달로 즉시 편집 */}
            {selectedComplex !== ALL_COMPLEXES && (
              <button
                type="button"
                onClick={() => setBankInfoEditOpen(true)}
                title={`${selectedComplex} 단지의 ${bankName ?? "본인 은행"} 안내글 편집 (입주민 앱 표시)`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--v4-info)",
                  background: "var(--v4-bg-info)",
                  border: "1px solid #B5CFEB",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Pencil size={13} strokeWidth={2} />
                단지 안내글 편집
              </button>
            )}
            {/* 단지 정보 관리 (관리비·정산항목 등 모든 은행 공유 데이터) */}
            <button
              type="button"
              onClick={() => navigate("/v4/complex-templates")}
              title="단지 정보 관리 (관리비·정산항목 — 모든 은행 공유)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--v4-text-secondary)",
                background: "var(--v4-bg-primary)",
                border: "1px solid var(--v4-border-secondary)",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Building2 size={13} strokeWidth={2} />
              단지 정보
            </button>
            <button
              type="button"
              onClick={() => setNewCustomerOpen(true)}
              className="v4-hdr-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "#fff",
                background: "var(--v4-info)",
                border: "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <UserPlus size={13} strokeWidth={2.2} />
              신규 고객
            </button>
            <UserMenu />
            <style>{`.v4-hdr-primary:hover { background: #1d4ed8; }`}</style>
          </div>
        </header>

        {/* Action cards (replaces KPI strip): 팀장 주요 기능 4개. 마지막 카드는 본문 3열(380px)과 정렬. */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr)) 380px",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <ActionCard
            label="상담 리스트"
            icon={<List size={18} strokeWidth={2} />}
            count={scopedTasks.length}
            tone="info"
            onClick={() => setConsultationListOpen(true)}
          />
          <ActionCard
            label="자서 예약"
            icon={<Calendar size={18} strokeWidth={2} />}
            count={kpi.signingToday}
            countSuffix="건 오늘"
            tone="warning"
            onClick={() => setSigningOpen(true)}
          />
          <ActionCard
            label="상환조회"
            icon={<FileText size={18} strokeWidth={2} />}
            count={kpi.executionToday}
            countSuffix="건 오늘"
            tone="success"
            onClick={() => setReportOpen(true)}
          />
          <ActionCard
            label="전체 진행현황"
            icon={<Layers size={18} strokeWidth={2} />}
            count={scopedTasks.length}
            countSuffix="건 전체"
            tone="info"
            onClick={() => setPipelineOpen(true)}
          />
        </section>

        {/* Body: 3 cols × 2 rows. 위/아래 행의 모든 셀이 동일 높이로 정렬. */}
        <section
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.45fr) 380px",
            // 상단 280px: 팀원별 현황 4명이 잘리지 않는 높이. 다른 패널(월별 실적·내가 챙길 것)은 내부 스크롤로 처리.
            gridTemplateRows: "280px minmax(0, 1fr)",
            gap: 10,
          }}
        >
          {/* Row 1, Col 1: 월별 실적 */}
          <GridCell>
            <MonthlyPerformancePanel
              tasks={scopedTasks}
              onOpenDetail={() => setMonthlyOpen(true)}
              fill
            />
          </GridCell>

          {/* Row 1, Col 2: 팀원별 현황 */}
          <GridCell>
            <Panel
              title="팀원별 현황"
              hint="행을 클릭하면 해당 담당자의 고객 목록으로 이동"
              fill
            >
                {memberRows.length === 0 ? (
                  <EmptyLine>담당자 데이터가 없습니다.</EmptyLine>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {memberRows.map((r, idx) => {
                      const isManagerSelf = r.name === MANAGER_ASSIGNEE_NAME;
                      const isRetired = r.inactive;
                      const loadPct =
                        maxMemberLoad > 0
                          ? Math.min(100, (r.total / maxMemberLoad) * 100)
                          : 0;
                      const isOverloaded = overloadedAssignees.has(r.name);
                      return (
                        <li
                          key={r.name}
                          onClick={() => gotoConsultant(r.name)}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(0, 1.2fr) minmax(80px, 1fr) auto auto 28px",
                            alignItems: "center",
                            gap: 10,
                            padding: "11px 6px",
                            cursor: "pointer",
                            borderTop:
                              idx === 0 ? "none" : "1px solid var(--v4-border-light)",
                            opacity: isRetired ? 0.55 : 1,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--v4-bg-tertiary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              minWidth: 0,
                            }}
                          >
                            <Avatar name={r.name} dim={isRetired} />
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "var(--v4-text-primary)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  letterSpacing: "-0.2px",
                                }}
                              >
                                {r.name}
                              </span>
                              {isManagerSelf ? (
                                <Badge tone="info">본인</Badge>
                              ) : null}
                              {isRetired ? (
                                <Badge tone="muted">비활성</Badge>
                              ) : null}
                              {isOverloaded && !isRetired ? (
                                <Badge tone="warning">과부하</Badge>
                              ) : null}
                            </span>
                          </span>
                          <LoadBar
                            pct={loadPct}
                            tone={
                              isRetired
                                ? "muted"
                                : r.total >= 5
                                  ? "danger"
                                  : r.total >= 3
                                    ? "warning"
                                    : "success"
                            }
                            label={`${r.total}`}
                          />
                          <span
                            className="v4-tabular"
                            style={{
                              fontSize: 12.5,
                              color: "var(--v4-text-tertiary)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            신규 {r.inbox} · 자서 {r.signing} · 실행 {r.execution}
                          </span>
                          <span
                            className="v4-tabular"
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              minWidth: 36,
                              textAlign: "right",
                              color:
                                r.risky > 0
                                  ? "var(--v4-danger)"
                                  : "var(--v4-text-tertiary)",
                            }}
                            title="위험건"
                          >
                            {r.risky > 0 ? `위험 ${r.risky}` : "—"}
                          </span>
                          <span
                            style={{ textAlign: "right" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!isManagerSelf ? (
                              isRetired ? (
                                <button
                                  type="button"
                                  title="다시 활성화"
                                  onClick={() => reactivate(r.name)}
                                  style={rowIconBtnStyle}
                                >
                                  <RotateCcw size={12} strokeWidth={2} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="비활성화 (퇴사)"
                                  onClick={() => setDeactivateFor(r.name)}
                                  style={rowIconBtnStyle}
                                >
                                  <UserMinus size={12} strokeWidth={2} />
                                </button>
                              )
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
          </GridCell>

          {/* Row 1, Col 3: 내가 챙길 것 (인터벤션 큐) */}
          <GridCell>
            <InterventionQueue
              tasks={scopedTasks}
              isInactive={isInactive}
              onSelectTask={(t) => openTask(t)}
              fill
            />
          </GridCell>

          {/* Row 2, Col 1: 오늘 일정 */}
          <GridCell>
            <TodayTimeline tasks={scopedTasks} onSelectTask={(t) => openTask(t)} fill />
          </GridCell>

          {/* Row 2, Col 2: 신규·미상담 큐 */}
          <GridCell>
              <Panel
                id="team-new-intake"
                title={`신규·미상담 큐 (${newIntakeItems.length})`}
                hint="첫 컨택이 필요하거나 배정 재검토가 필요한 건"
                fill
              >
                {newIntakeItems.length === 0 ? (
                  <EmptyLine>신규 접수 건 없음</EmptyLine>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {newIntakeItems.map((t, idx) => {
                      const reassignTag = reassignTagFor(t);
                      // 우선순위 시각화: 재배정 필요(danger) > 재배정 검토(warning) > 미상담(warning) > 신규(info)
                      const accentColor = reassignTag?.tone === "danger"
                        ? "var(--v4-danger)"
                        : reassignTag?.tone === "warning" || t.tag === "미상담"
                        ? "var(--v4-warning)"
                        : "transparent";
                      const accentBg = reassignTag?.tone === "danger"
                        ? "var(--v4-bg-danger)"
                        : reassignTag?.tone === "warning" || t.tag === "미상담"
                        ? "var(--v4-bg-warning)"
                        : "transparent";
                      const restingBg = accentColor === "transparent"
                        ? "transparent"
                        : accentBg;
                      return (
                      <li
                        key={t.id}
                        onClick={() => openTask(t)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto auto 14px",
                          alignItems: "center",
                          gap: 8,
                          padding: "13px 6px 13px 9px",
                          cursor: "pointer",
                          borderLeft: `3px solid ${accentColor}`,
                          background: restingBg,
                          borderTop:
                            idx === 0 ? "none" : "1px solid var(--v4-border-light)",
                          transition: "background 120ms ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--v4-bg-tertiary)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = restingBg)
                        }
                      >
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--v4-text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              letterSpacing: "-0.2px",
                            }}
                          >
                            {t.customerName}
                            <span
                              style={{
                                marginLeft: 7,
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 3,
                                background: "var(--v4-bg-info)",
                                color: "var(--v4-text-info)",
                                letterSpacing: 0.3,
                                verticalAlign: "middle",
                              }}
                            >
                              {t.tag}
                            </span>
                            {reassignTag ? (
                              <span
                                style={{
                                  marginLeft: 5,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  background:
                                    reassignTag.tone === "danger"
                                      ? "var(--v4-bg-danger)"
                                      : "var(--v4-bg-warning)",
                                  color:
                                    reassignTag.tone === "danger"
                                      ? "var(--v4-danger)"
                                      : "var(--v4-warning)",
                                  letterSpacing: 0.3,
                                  verticalAlign: "middle",
                                }}
                              >
                                {reassignTag.label}
                              </span>
                            ) : null}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 12.5,
                              color: "var(--v4-text-tertiary)",
                              marginTop: 3,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.addressLabel}
                            {t.phone ? ` · ${t.phone}` : ""}
                          </span>
                        </span>
                        <div
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AssigneeSelect
                            value={t.assignee}
                            options={teamMembers}
                            onChange={(v) => reassign(t.id, v)}
                            onClear={() => clearAssignment(t.id)}
                            originalAssignee={originalAssigneeById.get(t.id)}
                            reassigned={!!reassignMap[t.id]}
                          />
                          {t.assignee !== MANAGER_ASSIGNEE_NAME ? (
                            <AssignToSelfButton onClick={() => assignSelfReassign(t.id)} />
                          ) : null}
                        </div>
                        <span
                          className="v4-tabular"
                          style={{
                            fontSize: 12.5,
                            color: "var(--v4-text-tertiary)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.time ? (
                            <>
                              <Clock size={12} strokeWidth={2} />
                              {t.time}
                            </>
                          ) : null}
                        </span>
                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          style={{ color: "var(--v4-text-tertiary)" }}
                        />
                      </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
          </GridCell>

          {/* Row 2, Col 3: 캘린더 */}
          <GridCell>
            <TeamCalendar tasks={scopedTasks} onSelectTask={openTask} fill />
          </GridCell>
        </section>
      </div>

      {newCustomerOpen ? (
        <NewCustomerModal
          complexes={complexes}
          defaultComplex={complexes[0]}
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
                memo:
                  [data.source ? `유입경로: ${data.source}` : "", data.note]
                    .filter(Boolean)
                    .join("\n") || undefined,
              });
              await refetchTasks();
              navigate(`/v4/wizard/consultation/${created.id}`);
            } catch (e) {
              console.warn("[TeamDashboard:createBankConsultation]", e);
              window.alert("신규 고객 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
          }}
        />
      ) : null}
      {bankInfoEditOpen && selectedComplex !== ALL_COMPLEXES && (
        <ComplexBankInlineEdit
          complexName={selectedComplex}
          onClose={() => setBankInfoEditOpen(false)}
        />
      )}
      {consultationListOpen ? (
        <ConsultationListModal
          items={scopedTasks}
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
      {signingOpen ? (
        <SigningListModal
          items={scopedTasks.filter((t) => t.tag === "자서")}
          onClose={() => setSigningOpen(false)}
          onRowClick={(id) => {
            setSigningOpen(false);
            navigate(`/v4/wizard/signing/${id}`);
          }}
        />
      ) : null}
      {reportOpen ? (
        <RepaymentEmbedModal
          items={scopedTasks}
          complex={selectedComplex === ALL_COMPLEXES ? "전체 아파트" : selectedComplex}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
      {pipelineOpen ? (
        <PipelineOverviewModal
          items={scopedTasks}
          scopeLabel={selectedComplex === ALL_COMPLEXES ? "전체 아파트" : selectedComplex}
          onClose={() => setPipelineOpen(false)}
        />
      ) : null}
      {monthlyOpen ? (
        <MonthlyPerformanceModal
          items={scopedTasks}
          onClose={() => setMonthlyOpen(false)}
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
      {deactivateFor ? (
        <DeactivateConsultantModal
          name={deactivateFor}
          tasks={effectiveTasks.filter((t) => t.assignee === deactivateFor)}
          otherMembers={allMemberNames.filter(
            (n) => n !== deactivateFor && !isInactive(n),
          )}
          onClose={() => setDeactivateFor(null)}
          onConfirm={handleDeactivateConfirm}
        />
      ) : null}
    </AppShell>
  );
}

function Avatar({ name, dim }: { name: string; dim?: boolean }) {
  const initial = (name || "?").trim().slice(0, 1);
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: dim ? "var(--v4-bg-tertiary)" : "var(--v4-bg-info)",
        color: dim ? "var(--v4-text-tertiary)" : "var(--v4-text-info)",
        fontSize: 12.5,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "info" | "muted" | "warning";
  children: React.ReactNode;
}) {
  const palette =
    tone === "info"
      ? { bg: "var(--v4-bg-info)", color: "var(--v4-text-info)" }
      : tone === "warning"
        ? { bg: "var(--v4-bg-warning)", color: "var(--v4-warning)" }
        : { bg: "var(--v4-bg-tertiary)", color: "var(--v4-text-tertiary)" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 3,
        background: palette.bg,
        color: palette.color,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function LoadBar({
  pct,
  tone,
  label,
}: {
  pct: number;
  tone: "info" | "warning" | "danger" | "muted" | "success";
  label: string;
}) {
  const palette =
    tone === "warning"
      ? { fill: "var(--v4-warning)", track: "var(--v4-bg-warning)" }
      : tone === "danger"
        ? { fill: "var(--v4-danger)", track: "var(--v4-bg-danger)" }
        : tone === "success"
          ? { fill: "var(--v4-success)", track: "var(--v4-bg-success)" }
          : tone === "muted"
            ? { fill: "var(--v4-text-tertiary)", track: "var(--v4-bg-tertiary)" }
            : { fill: "var(--v4-info)", track: "var(--v4-bg-info)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          position: "relative",
          flex: 1,
          height: 6,
          minWidth: 40,
          borderRadius: 3,
          background: palette.track,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: palette.fill,
            borderRadius: 3,
          }}
        />
      </span>
      <span
        className="v4-tabular"
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--v4-text-secondary)",
          minWidth: 18,
          textAlign: "right",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function AssignToSelfButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="내가 직접 처리 (팀장에게 배정)"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        fontSize: 10.5,
        fontWeight: 500,
        color: "var(--v4-text-info)",
        background: "var(--v4-bg-info)",
        border: "1px solid var(--v4-border-info)",
        borderRadius: 4,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      <UserCheck size={10} strokeWidth={2} />
      내가 처리
    </button>
  );
}

// ——————————— AssigneeSelect ———————————

const RESET_ASSIGNEE_SENTINEL = "__reset-assignee__";

function AssigneeSelect({
  value,
  options,
  onChange,
  onClear,
  originalAssignee,
  reassigned,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onClear?: () => void;
  originalAssignee?: string;
  reassigned?: boolean;
}) {
  const trimmed = value?.trim() ?? "";
  const unassigned = trimmed === "";
  const display = unassigned ? "미배정" : trimmed;
  const allOptions = unassigned
    ? options
    : options.includes(display)
      ? options
      : [display, ...options];
  const canReset = !!(reassigned && onClear && originalAssignee && originalAssignee !== display);

  const paletteBg = unassigned
    ? "transparent"
    : reassigned
      ? "var(--v4-bg-warning)"
      : "var(--v4-bg-tertiary)";
  const paletteColor = unassigned
    ? "var(--v4-text-info)"
    : reassigned
      ? "var(--v4-text-warning)"
      : "var(--v4-text-secondary)";
  const paletteBorder = unassigned
    ? "1px dashed var(--v4-info)"
    : `1px solid ${reassigned ? "var(--v4-border-warning)" : "var(--v4-border-light)"}`;

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      title={
        unassigned
          ? "담당자를 지정하세요"
          : reassigned
            ? "재배정됨 (클릭하여 변경)"
            : "담당자 변경"
      }
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 16px 2px 6px",
        fontSize: 11,
        fontWeight: 500,
        color: paletteColor,
        background: paletteBg,
        border: paletteBorder,
        borderRadius: 4,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {unassigned ? (
        <>
          <UserPlus size={10} strokeWidth={2} />
          담당자 지정
        </>
      ) : (
        display
      )}
      <ChevronRight
        size={9}
        strokeWidth={2}
        style={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      />
      <select
        value={unassigned ? "" : display}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = e.target.value;
          if (v === RESET_ASSIGNEE_SENTINEL) {
            onClear?.();
            return;
          }
          if (v === "") return;
          onChange(v);
        }}
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
        {unassigned ? <option value="">담당자 선택…</option> : null}
        {allOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        {canReset ? (
          <>
            <option disabled>──────────</option>
            <option value={RESET_ASSIGNEE_SENTINEL}>
              ↺ 원래 담당({originalAssignee})으로
            </option>
          </>
        ) : null}
      </select>
    </label>
  );
}

// ——————————— Subcomponents ———————————

function ActionCard({
  label,
  icon,
  count,
  countSuffix,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  countSuffix?: string;
  tone?: "info" | "warning" | "success";
  onClick: () => void;
}) {
  const palette =
    tone === "warning"
      ? { bg: "var(--v4-bg-warning)", color: "var(--v4-warning)" }
      : tone === "success"
        ? { bg: "var(--v4-bg-success)", color: "var(--v4-success)" }
        : { bg: "var(--v4-bg-info)", color: "var(--v4-info)" };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "16px 18px",
        background: "var(--v4-bg-secondary)",
        border: "1px solid var(--v4-border-light)",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "border-color 120ms, background 120ms",
        minHeight: 64,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = palette.color;
        e.currentTarget.style.background = "var(--v4-bg-tertiary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--v4-border-light)";
        e.currentTarget.style.background = "var(--v4-bg-secondary)";
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            background: palette.bg,
            color: palette.color,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.2px",
          }}
        >
          {label}
        </span>
      </span>
      {typeof count === "number" ? (
        <span
          className="v4-tabular"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: palette.color,
              letterSpacing: "-0.5px",
              lineHeight: 1,
            }}
          >
            {count}
          </span>
          {countSuffix ? (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: "var(--v4-text-tertiary)",
              }}
            >
              {countSuffix}
            </span>
          ) : null}
        </span>
      ) : (
        <ChevronRight
          size={18}
          strokeWidth={2}
          style={{ color: "var(--v4-text-tertiary)", flexShrink: 0 }}
        />
      )}
    </button>
  );
}

function GridCell({ children }: { children: React.ReactNode }) {
  // 그리드 셀 래퍼: 셀 높이를 채우고 내부 패널이 flex/height:100% 로 stretch 하도록 컨텍스트 제공.
  return (
    <div
      style={{
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

function Panel({
  id,
  title,
  hint,
  accent,
  children,
  fill,
}: {
  id?: string;
  title: string;
  hint?: string;
  accent?: "danger";
  children: React.ReactNode;
  // fill: stretch to parent flex column height, body scrolls internally.
  fill?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        background: "var(--v4-bg-secondary)",
        border: `1px solid ${accent === "danger" ? "var(--v4-danger)" : "var(--v4-border-light)"}`,
        borderRadius: 8,
        padding: 14,
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }
          : {}),
      }}
    >
      <header style={{ marginBottom: 12, flexShrink: 0 }}>
        <h2
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </h2>
        {hint ? (
          <p style={{ fontSize: 12, color: "var(--v4-text-tertiary)", margin: "3px 0 0" }}>{hint}</p>
        ) : null}
      </header>
      {fill ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

const rowIconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  border: "1px solid var(--v4-border-light)",
  background: "var(--v4-bg-primary)",
  color: "var(--v4-text-tertiary)",
  borderRadius: 4,
  cursor: "pointer",
  padding: 0,
};
function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--v4-text-tertiary)",
        padding: "20px 8px",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
