import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { NewCustomerData } from "../home/NewCustomerModal";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Check, Phone, MessageSquare, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import {
  getConsultationFixture,
  type ConsultationData,
  type ContactAttempt,
  type ContactMethod,
  type ContactResult,
  type CreditBureau,
  type DocStatus,
  type EmploymentType,
  type HousingStatus,
  type NextStep,
  type Ownership,
  type RequiredDoc,
} from "../wizard/consultationFixtures";
import { DsrSimulatorCard } from "../dsr/DsrSimulatorCard";
import { useWizardDraft } from "../wizard/useWizardDraft";
import { PipelineStrip } from "../wizard/PipelineStrip";
import { UserMenu } from "../auth/UserMenu";
import { api } from "@/lib/api";

// 상담 위저드의 nextStep 선택 → 백엔드 loan_status 매핑.
// 자서예약 → signing_reservation, 가심사 → reviewing, 그 외 → consulting (인박스 잔류).
const NEXT_STEP_TO_STATUS: Record<string, string> = {
  자서예약: "signing_reservation",
  가심사: "reviewing",
  후속연락: "consulting",
  보류: "consulting",
  타행이관: "cancel",
  미정: "consulting",
};

const METHODS: ContactMethod[] = ["전화", "문자", "카카오", "방문"];
const RESULTS: ContactResult[] = ["연결", "부재중", "거절", "전화끊김", "회신대기"];
const NEXT_STEPS: NextStep[] = ["자서예약", "가심사", "후속연락", "보류", "타행이관", "미정"];
const HOUSING: HousingStatus[] = ["선택", "무주택", "1주택 처분조건", "1주택 보유", "다주택"];
const BUREAUS: CreditBureau[] = ["CB", "NICE", "KCB"];
const OWNERSHIPS: Ownership[] = ["단독", "공동"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["선택", "직장", "자영업", "프리랜서", "기타"];

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ConsultationWizardProps = {
  embed?: boolean;
  embedId?: string;
  embedTask?: import("../home/TaskRow").TaskItem;
  onEmbedComplete?: () => void;
};

function taskToSeed(task?: import("../home/TaskRow").TaskItem) {
  if (!task) return undefined;
  const [dongHo, complex] = (task.addressLabel ?? "").split(" · ");
  return {
    customerName: task.customerName,
    dongHo: (dongHo ?? "").replace(/동\s*/, "-").replace(/호\s*$/, "").trim(),
    complex,
    phone: task.phone,
  };
}

// /v4/wizard/consultation/:id 로 신규고객 등록 직후 진입 시,
// HomeInbox 가 navigate state 로 폼 데이터를 넘긴다 → 초기 데이터에 덮어쓰기.
function newCustomerToOverride(
  nc?: NewCustomerData,
  receivedByName?: string | null,
): Partial<ConsultationData> | undefined {
  if (!nc) return undefined;
  const desired = Number((nc.loanAmount ?? "").replace(/[^\d]/g, ""));
  const noteParts = [nc.source ? `유입경로: ${nc.source}` : "", nc.note ?? ""].filter(Boolean);
  return {
    customerName: nc.customerName,
    phone: nc.phone,
    complex: nc.complex,
    dong: nc.dong,
    ho: nc.ho,
    dongHo: nc.dong && nc.ho ? `${nc.dong}-${nc.ho}` : "",
    unitType: nc.size ? `${nc.size}㎡` : "",
    ...(Number.isFinite(desired) && desired > 0 ? { desiredLoanAmount: desired } : {}),
    ...(noteParts.length > 0 ? { consultationMemo: noteParts.join("\n") } : {}),
    intakeDate: todayStr(),
    receivedBy: receivedByName ?? "",
    attempts: [],
  };
}

export default function ConsultationWizard({
  embed,
  embedId,
  embedTask,
  onEmbedComplete,
}: ConsultationWizardProps = {}) {
  const params = useParams<{ id: string }>();
  const id = embedId ?? params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, loginId } = useAuth();
  const consultantName = displayName ?? loginId ?? "";
  const seed = taskToSeed(embedTask);
  // 신규고객 등록 직후엔 embedTask 가 없고 (route 모드로 진입) navigate state 로만 전달됨.
  const newCustomerOverride = useMemo(
    () =>
      newCustomerToOverride(
        (location.state as { newCustomer?: NewCustomerData } | null)?.newCustomer,
        consultantName,
      ),
    // location.state 는 라우팅 시점에 한 번만 잡으면 충분
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { data, setData, savedAt, clearDraft } = useWizardDraft<ConsultationData>(
    "consultation",
    id ?? "",
    (rawId) => ({
      ...getConsultationFixture(rawId, seed),
      ...(newCustomerOverride ?? {}),
    }),
    // serverOverride 는 server-of-truth 필드 강제용. 신규 입력값은 사용자가 편집 가능해야 하므로
    // makeInitial 에서만 1회 적용하고 여기엔 넘기지 않는다.
    seed as Partial<ConsultationData> | undefined,
  );

  const patch = <K extends keyof ConsultationData>(k: K, v: ConsultationData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const updateAttempt = (idx: number, fields: Partial<ContactAttempt>) =>
    setData((d) => ({
      ...d,
      attempts: d.attempts.map((a, i) => (i === idx ? { ...a, ...fields } : a)),
    }));

  const addAttempt = (method: ContactMethod) => {
    const a: ContactAttempt = {
      id: `att-${Date.now()}`,
      date: todayStr(),
      time: nowTime(),
      method,
      result: method === "문자" || method === "카카오" ? "회신대기" : "부재중",
      note: "",
    };
    setData((d) => ({ ...d, attempts: [...d.attempts, a] }));
  };

  const removeAttempt = (idx: number) =>
    setData((d) => ({ ...d, attempts: d.attempts.filter((_, i) => i !== idx) }));

  const setDocStatus = (did: string, status: DocStatus) =>
    setData((d) => ({
      ...d,
      requiredDocs: d.requiredDocs.map((doc) =>
        doc.id === did
          ? {
              ...doc,
              status,
              requestedAt: status === "요청함" ? `${todayStr()} ${nowTime()}` : doc.requestedAt,
            }
          : doc,
      ),
    }));

  const requestDoc = (did: string) => {
    const doc = data.requiredDocs.find((d) => d.id === did);
    if (!doc) return;
    setDocStatus(did, "요청함");
  };

  const receiveDoc = (did: string) => setDocStatus(did, "받음");
  const resetDoc = (did: string) => setDocStatus(did, "대기");

  const ltvLimit = useMemo(() => {
    if (data.housingStatus === "선택") return null;
    if (data.housingStatus === "무주택") return data.isFirstTimeHomebuyer ? 80 : 70;
    if (data.housingStatus === "1주택 처분조건") return 70;
    if (data.housingStatus === "1주택 보유") return 50;
    if (data.housingStatus === "다주택") return 30;
    return null;
  }, [data.housingStatus, data.isFirstTimeHomebuyer]);

  const maxLtvLoan =
    ltvLimit != null && data.salePrice > 0 ? Math.floor((data.salePrice * ltvLimit) / 100) : 0;
  const desiredLtvPct = data.salePrice > 0 ? (data.desiredLoanAmount / data.salePrice) * 100 : 0;
  const overLtv = maxLtvLoan > 0 && data.desiredLoanAmount > maxLtvLoan;
  const ltvReady = data.salePrice > 0 && ltvLimit != null;
  const ltvHeadroom = maxLtvLoan > data.desiredLoanAmount ? maxLtvLoan - data.desiredLoanAmount : 0;
  const ltvBasisLabel =
    data.housingStatus === "선택"
      ? ""
      : `${data.housingStatus}${data.isFirstTimeHomebuyer ? " · 생애최초" : ""}`;

  const readiness = useMemo(() => {
    const infoFields = [
      data.housingStatus !== "선택",
      data.creditScore > 0,
      data.salePrice > 0,
      data.desiredLoanAmount > 0,
      data.annualIncome > 0,
      data.employmentType !== "선택",
    ];
    const infoDone = infoFields.filter(Boolean).length;
    const infoTotal = infoFields.length;
    const docReceived = data.requiredDocs.filter((d) => d.status === "받음").length;
    const docRequested = data.requiredDocs.filter((d) => d.status !== "대기").length;
    const docTotal = data.requiredDocs.length;
    const ready = infoDone === infoTotal && docReceived === docTotal;
    return { infoDone, infoTotal, docReceived, docRequested, docTotal, ready };
  }, [data.housingStatus, data.creditScore, data.salePrice, data.desiredLoanAmount, data.annualIncome, data.employmentType, data.requiredDocs]);

  const status = useMemo(() => {
    const connected = data.attempts.some((a) => a.result === "연결");
    const tries = data.attempts.length;
    if (connected) return { tone: "success" as const, text: "상담 연결" };
    if (tries === 0) return { tone: "danger" as const, text: "미상담 — 컨택 필요" };
    if (tries >= 3) return { tone: "warning" as const, text: `${tries}회 시도 — 회신 대기` };
    return { tone: "warning" as const, text: `${tries}회 시도 중` };
  }, [data.attempts]);

  const statusColor =
    status.tone === "danger"
      ? "var(--v4-danger)"
      : status.tone === "warning"
      ? "var(--v4-warning)"
      : "var(--v4-success)";
  const complete = async () => {
    if (data.nextStep === "미정") {
      const ok = window.confirm("다음 단계가 선택되지 않았습니다. 그래도 종료할까요?");
      if (!ok) return;
    }
    const nextStatus = NEXT_STEP_TO_STATUS[data.nextStep] ?? "consulting";
    if (id) {
      try { await api.updateBankStatus(id, nextStatus); } catch (e) { console.warn("[updateBankStatus]", e); }
    }
    if (data.nextStep === "자서예약") {
      const goReservation = window.confirm(
        `${data.customerName} 고객 상담 처리됨 → 자서예약\n\n자서예약 위저드로 이동해 일정·장소를 잡으시겠습니까?`,
      );
      clearDraft();
      if (goReservation) {
        navigate(`/v4/wizard/reservation/${id}`);
      } else if (embed) {
        onEmbedComplete?.();
      } else {
        navigate("/v4");
      }
      return;
    }
    toast.success("상담 처리됨", {
      description: `${data.customerName} 고객 → ${data.nextStep}`,
    });
    clearDraft();
    if (embed) {
      onEmbedComplete?.();
    } else {
      navigate("/v4");
    }
  };

  useEffect(() => {
    if (embed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/v4");
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, embed]);

  const savedLabel = savedAt
    ? `임시 저장됨 · ${savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
    : "입력 시 임시 저장됩니다";

  return (
    <div
      className="v4-root"
      style={{
        ...(embed
          ? { height: "100%", overflowY: "auto" }
          : { minHeight: "100vh" }),
        background: "var(--v4-bg-secondary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--v4-border-tertiary)",
          background: "var(--v4-bg-primary)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          minHeight: 48,
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {embed ? null : (
          <Link
            to="/v4"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "var(--v4-text-secondary)",
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: "var(--v4-radius-md)",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={13} strokeWidth={1.8} />
            오늘의 리스트
            <Kbd>ESC</Kbd>
          </Link>
        )}

        {/* Customer breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 12.5,
            minWidth: 0,
          }}
        >
          <strong style={{ color: "var(--v4-text-primary)", fontWeight: 600 }}>
            {data.customerName}
          </strong>
          <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
          <span style={{ color: "var(--v4-text-secondary)" }} className="v4-tabular">
            {data.dongHo}
          </span>
          <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
          <span
            style={{
              color: "var(--v4-text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 180,
            }}
            title={data.complex}
          >
            {data.complex}
          </span>
          <span
            style={{
              fontSize: 10.5,
              color: "var(--v4-warning)",
              background: "var(--v4-bg-warning)",
              padding: "2px 8px",
              borderRadius: "var(--v4-radius-sm)",
              fontWeight: 500,
              marginLeft: 4,
              whiteSpace: "nowrap",
            }}
          >
            {data.dDay}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Status counters + pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11.5,
            color: "var(--v4-text-secondary)",
            flexShrink: 0,
          }}
        >
          <span>
            컨택 <strong className="v4-tabular">{data.attempts.length}</strong>
          </span>
          <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
          <span>
            정보{" "}
            <strong className="v4-tabular">
              {readiness.infoDone}/{readiness.infoTotal}
            </strong>
          </span>
          <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
          <span>
            서류{" "}
            <strong className="v4-tabular">
              {readiness.docReceived}/{readiness.docTotal}
            </strong>
            {readiness.docRequested > readiness.docReceived ? (
              <span style={{ color: "var(--v4-text-tertiary)", marginLeft: 3 }}>
                (요청 {readiness.docRequested - readiness.docReceived})
              </span>
            ) : null}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: statusColor,
              padding: "2px 8px",
              borderRadius: "var(--v4-radius-sm)",
              whiteSpace: "nowrap",
              marginLeft: 2,
            }}
          >
            {status.text}
          </span>
        </div>

        {embed ? null : (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--v4-text-tertiary)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {savedLabel}
          </span>
        )}
        <button
          type="button"
          onClick={complete}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 28,
            padding: "0 12px",
            fontSize: 12.5,
            color: "#fff",
            background: "var(--v4-text-primary)",
            border: "none",
            borderRadius: "var(--v4-radius-md)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          상담 처리
          {embed ? null : <Kbd>⌘↵</Kbd>}
        </button>
        {embed ? null : <UserMenu />}
      </header>

      {embed ? null : (
        <PipelineStrip current={data.nextStep === "자서예약" ? 1 : 0} caseId={id ?? ""} />
      )}

      <main
        style={{
          flex: 1,
          maxWidth: 1320,
          width: "100%",
          margin: "0 auto",
          padding: "12px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 12,
            alignItems: "start",
          }}
        >
        {/* 좌측 컬럼 */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
          }}
        >
          <Card title="고객 기본">
            <RowGrid cols="80px 1fr 80px 1fr" divider>
              <Label>계약자</Label>
              <Input value={data.customerName} onChange={(v) => patch("customerName", v)} bold />
              <Label>연락처</Label>
              <PhoneCell phone={data.phone} onChange={(v) => patch("phone", v)} />
            </RowGrid>
            <RowGrid cols="80px 1fr 80px 1fr" divider>
              <Label>주민번호</Label>
              <Input
                value={data.residentNumber}
                onChange={(v) => patch("residentNumber", v)}
                placeholder="주민등록번호"
                tabular
              />
              <Label>배우자</Label>
              <Input
                value={data.spousePhone}
                onChange={(v) => patch("spousePhone", v)}
                placeholder="배우자 연락처 (선택)"
                tabular
                align="right"
              />
            </RowGrid>
            <RowGrid cols="80px 1fr 80px 1fr">
              <Label>접수일</Label>
              <Input value={data.intakeDate} onChange={(v) => patch("intakeDate", v)} tabular />
              <Label>담당자</Label>
              <Input value={data.receivedBy} onChange={(v) => patch("receivedBy", v)} align="right" medium />
            </RowGrid>
          </Card>

          <Card title="입주 물건">
            <RowGrid cols="60px 1fr 60px 1fr" divider>
              <Label>동</Label>
              <Input value={data.dong} onChange={(v) => patch("dong", v)} tabular />
              <Label>호수</Label>
              <Input value={data.ho} onChange={(v) => patch("ho", v)} tabular align="right" />
            </RowGrid>
            <RowGrid cols="60px 1fr 60px 1fr" divider>
              <Label>타입</Label>
              <Input value={data.unitType} onChange={(v) => patch("unitType", v)} tabular />
              <Label>명의</Label>
              <Select
                value={data.ownership}
                options={OWNERSHIPS}
                onChange={(v) => patch("ownership", v as Ownership)}
              />
            </RowGrid>
            <RowGrid cols="60px 1fr 60px 1fr">
              <Label>기표일</Label>
              <Input value={data.executionDate} onChange={(v) => patch("executionDate", v)} placeholder="YYYY-MM-DD" tabular />
              <Label>전매일</Label>
              <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                <Input
                  value={data.isOriginalBuyer ? "" : data.resaleDate}
                  onChange={(v) => patch("resaleDate", v)}
                  placeholder={data.isOriginalBuyer ? "해당없음" : "YYYY-MM-DD"}
                  tabular
                  align="right"
                  disabled={data.isOriginalBuyer}
                />
                <InlineCheck
                  checked={data.isOriginalBuyer}
                  onChange={(v) => patch("isOriginalBuyer", v)}
                  label="원분양자"
                />
              </span>
            </RowGrid>
          </Card>

          {/* 상담 메모 */}
          <div
            style={{
              background: "var(--v4-bg-primary)",
              border: "1px solid var(--v4-border-tertiary)",
              borderRadius: "var(--v4-radius-md)",
              padding: 10,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                color: "var(--v4-text-tertiary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              상담 메모
            </div>
            <textarea
              value={data.consultationMemo}
              onChange={(e) => patch("consultationMemo", e.target.value)}
              placeholder="상담 내용·고객 우려·주요 문답·다음 회신 시점 등 자유 메모"
              rows={4}
              style={{
                width: "100%",
                border: "1px solid var(--v4-border-tertiary)",
                outline: "none",
                background: "var(--v4-bg-secondary)",
                fontSize: 12.5,
                color: "var(--v4-text-primary)",
                padding: "8px 10px",
                borderRadius: "var(--v4-radius-sm)",
                fontFamily: "inherit",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* 다음 단계 */}
          <Card title="다음 단계">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 0 8px" }}>
              {NEXT_STEPS.map((s) => {
                const active = data.nextStep === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch("nextStep", s)}
                    style={{
                      fontSize: 12,
                      padding: "5px 12px",
                      borderRadius: "var(--v4-radius-sm)",
                      border: active ? "1px solid var(--v4-text-primary)" : "1px solid var(--v4-border-tertiary)",
                      background: active ? "var(--v4-text-primary)" : "var(--v4-bg-primary)",
                      color: active ? "#fff" : "var(--v4-text-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Card>
        </aside>

        {/* 우측 스크롤 영역 */}
        <section style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {/* 고객 현황 (가심사 필요 정보) */}
        <Card title="고객 현황 · 가심사 필요 정보">
          <RowGrid cols="60px minmax(140px, 1fr) 60px minmax(150px, 1fr) 60px minmax(130px, 1fr)" divider>
            <Label>주택보유</Label>
            <Select
              value={data.housingStatus}
              options={HOUSING}
              onChange={(v) => patch("housingStatus", v as HousingStatus)}
            />
            <Label>세대주</Label>
            <ToggleChip
              value={data.isHouseholdHead}
              onChange={(v) => patch("isHouseholdHead", v)}
              labelOn="예"
              labelOff="아니오"
            />
            <Label>생애최초</Label>
            <ToggleChip
              value={data.isFirstTimeHomebuyer}
              onChange={(v) => patch("isFirstTimeHomebuyer", v)}
              labelOn="예"
              labelOff="아니오"
            />
          </RowGrid>
          <RowGrid cols="80px 1fr 100px 1fr" divider>
            <Label>분양가</Label>
            <MoneyCell value={data.salePrice} onChange={(n) => patch("salePrice", n)} />
            <Label>희망 대출</Label>
            <MoneyCell
              value={data.desiredLoanAmount}
              onChange={(n) => patch("desiredLoanAmount", n)}
            />
          </RowGrid>
          <RowGrid cols="80px 1fr" divider>
            <Label>LTV 분석</Label>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 8,
                rowGap: 2,
                fontSize: 11.5,
                color: "var(--v4-text-secondary)",
              }}
            >
              {ltvReady ? (
                <>
                  <span>
                    {ltvBasisLabel ? `${ltvBasisLabel} · ` : ""}LTV <b>{ltvLimit}%</b>
                  </span>
                  <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
                  <span className="v4-tabular">
                    최대 <b>{fmt(maxLtvLoan)}</b>원
                  </span>
                  {data.desiredLoanAmount > 0 && (
                    <>
                      <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
                      <span
                        className="v4-tabular"
                        style={{
                          color: overLtv ? "var(--v4-danger)" : "var(--v4-text-tertiary)",
                          fontWeight: overLtv ? 600 : 400,
                        }}
                      >
                        희망 {desiredLtvPct.toFixed(1)}%
                        {overLtv
                          ? " · 한도 초과"
                          : ltvHeadroom > 0
                          ? ` · 여유 ${fmt(ltvHeadroom)}원`
                          : ""}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--v4-text-tertiary)" }}>
                  {data.salePrice > 0
                    ? "주택보유 선택 시 LTV 한도 계산"
                    : "분양가 · 주택보유 입력 시 LTV 한도 계산"}
                </span>
              )}
            </span>
          </RowGrid>
          <RowGrid cols="80px auto 100px auto 1fr" divider>
            <Label>상환 기간</Label>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 72 }}>
                <NumberInput
                  value={data.loanPeriodYears}
                  onChange={(n) => patch("loanPeriodYears", n)}
                  placeholder="30"
                  align="right"
                />
              </div>
              <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}>년</span>
            </span>
            <Label>거치 기간</Label>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 72 }}>
                <NumberInput
                  value={data.gracePeriodYears}
                  onChange={(n) => patch("gracePeriodYears", n)}
                  placeholder="0"
                  align="right"
                />
              </div>
              <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}>년</span>
            </span>
            <span
              style={{
                fontSize: 11.5,
                color: "var(--v4-text-tertiary)",
                paddingLeft: 8,
              }}
            >
              {data.gracePeriodYears > 0
                ? `${data.gracePeriodYears}년 거치 · 이후 ${Math.max(
                    data.loanPeriodYears - data.gracePeriodYears,
                    0,
                  )}년 원리금`
                : "거치 없음 · 즉시 원리금 상환"}
            </span>
          </RowGrid>
          <RowGrid cols="60px minmax(140px, 1fr) 60px minmax(150px, 1fr) 60px minmax(130px, 1fr)" divider>
            <Label>신용점수</Label>
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Select
                value={data.creditBureau}
                options={BUREAUS}
                onChange={(v) => patch("creditBureau", v as CreditBureau)}
              />
              <NumberInput
                value={data.creditScore}
                onChange={(n) => patch("creditScore", n)}
                placeholder="점수"
                align="right"
              />
            </span>
            <Label>연소득</Label>
            <MoneyCell value={data.annualIncome} onChange={(n) => patch("annualIncome", n)} />
            <Label>재직</Label>
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Select
                value={data.employmentType}
                options={EMPLOYMENT_TYPES}
                onChange={(v) => patch("employmentType", v as EmploymentType)}
              />
              <NumberInput
                value={data.employmentYears}
                onChange={(n) => patch("employmentYears", n)}
                placeholder="년수"
                align="right"
              />
            </span>
          </RowGrid>
          <RowGrid cols="80px auto 100px auto 1fr">
            <Label>기 신용대출</Label>
            <MoneyCell value={data.existingCreditLoan} onChange={(n) => patch("existingCreditLoan", n)} />
            <Label>기 담보대출</Label>
            <MoneyCell value={data.existingMortgage} onChange={(n) => patch("existingMortgage", n)} />
            <span />
          </RowGrid>
          <RowGrid cols="80px 1fr">
            <Label>기타 대출</Label>
            <Input
              value={data.otherLoansNote}
              onChange={(v) => patch("otherLoansNote", v)}
              placeholder="학자금, 렌트론, 보험약관대출, 자동차할부 등 자유 기술"
            />
          </RowGrid>
        </Card>

        {/* DSR 시뮬레이션 */}
        <DsrSimulatorCard
          annualIncome={data.annualIncome}
          existingCreditLoan={data.existingCreditLoan}
          existingMortgage={data.existingMortgage}
          desiredLoanAmount={data.desiredLoanAmount}
          loanYears={data.loanPeriodYears}
          interestRate={data.interestRate}
        />

        </section>
        </div>

        {/* 컨택 기록 — 하단 전체폭 */}
        <Card title={`컨택 기록 (${data.attempts.length})`} pad={0}>
          <TableHeader cols="110px 80px 96px 120px 1fr 32px">
            <span>일자</span>
            <span>시간</span>
            <span>방법</span>
            <span>결과</span>
            <span>비고</span>
            <span></span>
          </TableHeader>
          {data.attempts.length === 0 ? (
            <div
              style={{
                padding: "16px 14px",
                textAlign: "center",
                color: "var(--v4-text-tertiary)",
                fontSize: 12,
                background: "var(--v4-bg-secondary)",
              }}
            >
              아직 컨택 기록이 없습니다. 아래 버튼으로 추가하세요.
            </div>
          ) : (
            data.attempts.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 80px 96px 120px 1fr 32px",
                  columnGap: 12,
                  alignItems: "center",
                  padding: "4px 14px",
                  borderBottom: "1px solid var(--v4-border-tertiary)",
                  fontSize: 12.5,
                  minHeight: 32,
                }}
              >
                <Input value={a.date} onChange={(v) => updateAttempt(i, { date: v })} tabular />
                <Input value={a.time} onChange={(v) => updateAttempt(i, { time: v })} tabular />
                <Select
                  value={a.method}
                  options={METHODS}
                  onChange={(v) => updateAttempt(i, { method: v as ContactMethod })}
                />
                <Select
                  value={a.result}
                  options={RESULTS}
                  onChange={(v) => updateAttempt(i, { result: v as ContactResult })}
                />
                <Input
                  value={a.note ?? ""}
                  onChange={(v) => updateAttempt(i, { note: v })}
                  placeholder="—"
                  tertiary
                />
                <button
                  type="button"
                  onClick={() => removeAttempt(i)}
                  title="삭제"
                  style={{
                    width: 24,
                    height: 24,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "1px solid transparent",
                    borderRadius: 4,
                    cursor: "pointer",
                    color: "var(--v4-text-tertiary)",
                  }}
                >
                  <Trash2 size={12} strokeWidth={1.8} />
                </button>
              </div>
            ))
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              background: "var(--v4-bg-secondary)",
              borderTop: "1px solid var(--v4-border-tertiary)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--v4-text-tertiary)",
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  marginRight: 2,
                }}
              >
                필수 서류 {readiness.docReceived}/{readiness.docTotal}
              </span>
              {data.requiredDocs.map((d) => (
                <DocChip
                  key={d.id}
                  doc={d}
                  onClick={() => {
                    if (d.status === "대기") requestDoc(d.id);
                    else if (d.status === "요청함") receiveDoc(d.id);
                    else resetDoc(d.id);
                  }}
                />
              ))}
            </div>
            <span
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "var(--v4-border-tertiary)",
                margin: "0 4px",
              }}
            />
            <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
              <AddBtn icon={<Phone size={11} />} label="전화" onClick={() => addAttempt("전화")} />
              <AddBtn icon={<MessageSquare size={11} />} label="문자" onClick={() => addAttempt("문자")} />
              <AddBtn icon={<MessageSquare size={11} />} label="카카오" onClick={() => addAttempt("카카오")} />
              <AddBtn icon={<Plus size={11} />} label="방문" onClick={() => addAttempt("방문")} />
            </div>
          </div>
        </Card>

      </main>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────── */

function Card({ title, children, pad = 10 }: { title?: string; children: ReactNode; pad?: number }) {
  return (
    <div
      style={{
        background: "var(--v4-bg-primary)",
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: "var(--v4-radius-md)",
        overflow: "hidden",
      }}
    >
      {title ? (
        <div
          style={{
            fontSize: 10.5,
            color: "var(--v4-text-tertiary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            padding: "6px 12px 2px",
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ padding: pad ? (title ? `0 ${pad}px ${pad}px` : `${pad}px`) : 0 }}>
        {children}
      </div>
    </div>
  );
}

function RowGrid({ cols, children, divider }: { cols: string; children: ReactNode; divider?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        alignItems: "center",
        columnGap: 8,
        padding: "4px 0",
        borderBottom: divider ? "1px dashed var(--v4-border-tertiary)" : "none",
        fontSize: 12.5,
        minHeight: 26,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>{children}</span>;
}

function Input({
  value,
  onChange,
  placeholder,
  tabular,
  align = "left",
  bold,
  medium,
  tertiary,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tabular?: boolean;
  align?: "left" | "right";
  bold?: boolean;
  medium?: boolean;
  tertiary?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={tabular ? "v4-tabular" : undefined}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: 13,
        color: disabled
          ? "var(--v4-text-tertiary)"
          : tertiary
          ? "var(--v4-text-tertiary)"
          : "var(--v4-text-primary)",
        padding: "4px 6px",
        borderRadius: 4,
        fontFamily: "inherit",
        textAlign: align,
        fontWeight: bold ? 600 : medium ? 500 : 400,
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={(e) => {
        if (!disabled) e.target.style.background = "var(--v4-bg-secondary)";
      }}
      onBlur={(e) => (e.target.style.background = "transparent")}
    />
  );
}

function PhoneCell({ phone, onChange }: { phone: string; onChange: (v: string) => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        gap: 4,
      }}
    >
      <Input value={phone} onChange={onChange} tabular align="right" />
      <a
        href={`tel:${phone}`}
        title="전화 걸기"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          background: "transparent",
          border: "1px solid var(--v4-border-tertiary)",
          borderRadius: 4,
          color: "var(--v4-text-secondary)",
        }}
      >
        <Phone size={11} strokeWidth={2} />
      </a>
    </span>
  );
}

function NumberInput({
  value,
  onChange,
  align = "left",
  step,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  align?: "left" | "right";
  step?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  useEffect(() => setText(value ? String(value) : ""), [value]);
  return (
    <input
      type="text"
      inputMode={step ? "decimal" : "numeric"}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const cleaned = raw.replace(step ? /[^\d.\-]/g : /[^\d-]/g, "");
        onChange(cleaned ? Number(cleaned) : 0);
      }}
      onFocus={(e) => {
        e.target.style.background = "var(--v4-bg-primary)";
        e.target.style.borderColor = "var(--v4-text-tertiary)";
      }}
      onBlur={(e) => {
        e.target.style.background = "var(--v4-bg-secondary)";
        e.target.style.borderColor = "var(--v4-border-tertiary)";
      }}
      className="v4-tabular"
      style={{
        width: "100%",
        border: "1px solid var(--v4-border-tertiary)",
        outline: "none",
        background: "var(--v4-bg-secondary)",
        fontSize: 13,
        color: "var(--v4-text-primary)",
        padding: "3px 8px",
        borderRadius: 4,
        fontFamily: "inherit",
        textAlign: align,
        fontWeight: 500,
      }}
    />
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        border: "1px solid var(--v4-border-tertiary)",
        outline: "none",
        background: "var(--v4-bg-primary)",
        fontSize: 12.5,
        color: "var(--v4-text-primary)",
        padding: "3px 6px",
        borderRadius: 4,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function MoneyCell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(value ? value.toLocaleString("ko-KR") : "");
  useEffect(() => {
    setText(value ? value.toLocaleString("ko-KR") : "");
  }, [value]);
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, justifyContent: "flex-start", width: "100%" }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const cleaned = raw.replace(/[^\d-]/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        onBlur={(e) => {
          setText(value ? value.toLocaleString("ko-KR") : "");
          e.target.style.background = "var(--v4-bg-secondary)";
          e.target.style.borderColor = "var(--v4-border-tertiary)";
        }}
        onFocus={(e) => {
          e.target.style.background = "var(--v4-bg-primary)";
          e.target.style.borderColor = "var(--v4-text-tertiary)";
        }}
        className="v4-tabular"
        style={{
          border: "1px solid var(--v4-border-tertiary)",
          outline: "none",
          background: "var(--v4-bg-secondary)",
          fontSize: 13,
          color: "var(--v4-text-primary)",
          padding: "3px 8px",
          borderRadius: 4,
          fontFamily: "inherit",
          textAlign: "right",
          fontWeight: 500,
          width: 130,
        }}
      />
      <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>원</span>
    </span>
  );
}

function TableHeader({ cols, children }: { cols: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        columnGap: 12,
        fontSize: 11,
        color: "var(--v4-text-tertiary)",
        fontWeight: 600,
        padding: "6px 14px",
        borderBottom: "1px solid var(--v4-border-secondary)",
        background: "var(--v4-bg-secondary)",
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {children}
    </div>
  );
}

function AddBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        padding: "5px 10px",
        background: "var(--v4-bg-primary)",
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: 4,
        cursor: "pointer",
        color: "var(--v4-text-secondary)",
        fontFamily: "inherit",
        fontWeight: 500,
      }}
    >
      {icon}
      {label} 추가
    </button>
  );
}

function ToggleChip({
  value,
  onChange,
  labelOn,
  labelOff,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={chipStyle(value)}
      >
        {labelOn}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={chipStyle(!value)}
      >
        {labelOff}
      </button>
    </span>
  );
}

function InlineCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11.5,
        color: checked ? "var(--v4-text-primary)" : "var(--v4-text-tertiary)",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ margin: 0, cursor: "pointer" }}
      />
      {label}
    </label>
  );
}

function chipStyle(active: boolean): CSSProperties {
  return {
    fontSize: 11.5,
    padding: "3px 8px",
    borderRadius: 4,
    border: active ? "1px solid var(--v4-text-primary)" : "1px solid var(--v4-border-tertiary)",
    background: active ? "var(--v4-text-primary)" : "var(--v4-bg-primary)",
    color: active ? "#fff" : "var(--v4-text-secondary)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: active ? 600 : 500,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

function DocChip({ doc, onClick }: { doc: RequiredDoc; onClick: () => void }) {
  const dotColor =
    doc.status === "받음"
      ? "var(--v4-success)"
      : doc.status === "요청함"
      ? "var(--v4-warning)"
      : "var(--v4-text-tertiary)";
  const bg =
    doc.status === "받음"
      ? "var(--v4-bg-success)"
      : doc.status === "요청함"
      ? "var(--v4-bg-warning)"
      : "var(--v4-bg-secondary)";
  const borderColor =
    doc.status === "받음"
      ? "var(--v4-success)"
      : doc.status === "요청함"
      ? "var(--v4-warning)"
      : "var(--v4-border-tertiary)";

  const title = [
    `${doc.label} · ${doc.status}`,
    doc.hint,
    doc.requestedAt ? `요청 ${doc.requestedAt}` : null,
    "클릭: 대기 → 요청함 → 받음",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 4,
        background: bg,
        border: `1px solid ${borderColor}55`,
        fontSize: 11.5,
        fontFamily: "inherit",
        fontWeight: 500,
        color: "var(--v4-text-primary)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span>{doc.label}</span>
      <span
        style={{
          fontSize: 10,
          color: "var(--v4-text-tertiary)",
          fontWeight: 400,
        }}
      >
        {doc.status}
      </span>
    </button>
  );
}

