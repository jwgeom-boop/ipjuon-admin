import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import { getExecutionFixture, type ExecutionData } from "../wizard/executionFixtures";
import { exportExecutionToExcel } from "../wizard/executionExport";
import { useWizardDraft } from "../wizard/useWizardDraft";
import { PipelineStrip } from "../wizard/PipelineStrip";
import { UserMenu } from "../auth/UserMenu";
import { api } from "@/lib/api";
import { executionToBackend } from "../data/wizardPersistence";
import { useWizardAutosave } from "../data/useWizardAutosave";

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

interface RowConfig {
  label: string;
  bankKey?: keyof ExecutionData;
  accountKey?: keyof ExecutionData;
  amountKey: keyof ExecutionData;
  note?: string;
}

const ROWS: RowConfig[] = [
  { label: "중도금", bankKey: "middleBank", accountKey: "middleAccount", amountKey: "middlePrincipal", note: "원금" },
  { label: "중도금이자", bankKey: "middleInterestBank", accountKey: "middleInterestAccount", amountKey: "middleInterest", note: "실행일확인" },
  { label: "분양잔금", bankKey: "balanceBank", accountKey: "balanceAccount", amountKey: "balancePrincipal", note: "시행사 입금" },
  { label: "발코니 확장", bankKey: "balconyBank", accountKey: "balconyAccount", amountKey: "balcony", note: "별매품1" },
  { label: "유상옵션", bankKey: "optionsBank", accountKey: "optionsAccount", amountKey: "options", note: "별매품2" },
  { label: "보증수수료", bankKey: "guaranteeFeeBank", accountKey: "guaranteeFeeAccount", amountKey: "guaranteeFee", note: "HUG/HF 대납이자" },
  { label: "선수관리비", bankKey: "mgmtFeeBank", accountKey: "mgmtFeeAccount", amountKey: "mgmtFee", note: "관리사무소" },
  { label: "이주비", bankKey: "movingAllowanceBank", accountKey: "movingAllowanceAccount", amountKey: "movingAllowance" },
  { label: "인지대", bankKey: "stampDutyBank", accountKey: "stampDutyAccount", amountKey: "stampDuty", note: "수입인지" },
  { label: "인지대 (추가대출)", bankKey: "stampDutyAdditionalBank", accountKey: "stampDutyAdditionalAccount", amountKey: "stampDutyAdditional" },
];

interface ExecutionWizardProps {
  idProp?: string;
  embedded?: boolean;
  embedTask?: import("../home/TaskRow").TaskItem;
  onComplete?: () => void;
}

function taskToSeed(task?: import("../home/TaskRow").TaskItem) {
  if (!task) return undefined;
  const [dongHo, complex] = (task.addressLabel ?? "").split(" · ");
  return {
    customerName: task.customerName,
    dongHo: (dongHo ?? "").replace(/동\s*/, "-").replace(/호\s*$/, "").trim(),
    complex,
    aptType: task.aptType ?? (task.size != null ? String(task.size) : undefined),
    phone: task.phone,
  };
}

export default function ExecutionWizard({ idProp, embedded, embedTask, onComplete }: ExecutionWizardProps = {}) {
  const params = useParams<{ id: string }>();
  const id = idProp ?? params.id;
  const navigate = useNavigate();
  const seed = taskToSeed(embedTask);
  const { data, setData, savedAt, clearDraft } = useWizardDraft<ExecutionData>(
    "execution",
    id ?? "",
    (rawId) => getExecutionFixture(rawId, seed),
    seed as Partial<ExecutionData> | undefined
  );

  const patch = <K extends keyof ExecutionData>(k: K, v: ExecutionData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const { isPersistableId } = useWizardAutosave(id, data, executionToBackend);

  const middleTotal = (data.middlePrincipal ?? 0) + (data.middleInterest ?? 0);
  const balanceTotal = (data.balancePrincipal ?? 0) + (data.balanceInterest ?? 0);
  const othersTotal =
    (data.balcony ?? 0) +
    (data.options ?? 0) +
    (data.guaranteeFee ?? 0) +
    (data.mgmtFee ?? 0) +
    (data.movingAllowance ?? 0) +
    (data.stampDuty ?? 0) +
    (data.stampDutyAdditional ?? 0);
  const totalRepayment = middleTotal + balanceTotal + othersTotal;
  const totalLoan = (data.loanAmount ?? 0) + (data.additionalLoan ?? 0);
  const required = totalRepayment - totalLoan;
  const verdictTone: "danger" | "success" | "neutral" =
    required > 0 ? "danger" : required < 0 ? "success" : "neutral";
  const verdictText = required > 0 ? "입금요청" : required < 0 ? "환급" : "정산 완료";

  const complete = async () => {
    if (id) {
      if (isPersistableId) {
        try {
          await api.updateBankConsultation(id, executionToBackend(data, { markCompleted: true }));
        } catch (e) {
          console.warn("[updateBankConsultation]", e);
        }
      }
      try { await api.updateBankStatus(id, "done"); } catch (e) { console.warn("[updateBankStatus]", e); }
    }
    toast.success("실행 완료 처리됨", { description: `${data.customerName} 고객` });
    clearDraft();
    if (onComplete) onComplete();
    else navigate("/v4");
  };

  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/v4");
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded]);

  const savedLabel = savedAt
    ? `임시 저장됨 · ${savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
    : "입력 시 임시 저장됩니다";

  const verdictColor =
    verdictTone === "danger" ? "var(--v4-danger)" : verdictTone === "success" ? "var(--v4-success)" : "var(--v4-text-primary)";

  const handlePrint = () => {
    window.print();
  };

  const handleExcel = () => {
    try {
      exportExecutionToExcel(data);
    } catch (err) {
      console.error("[exportExecutionToExcel]", err);
      toast.error("엑셀 저장 실패", { description: "잠시 후 다시 시도해 주세요" });
    }
  };

  // 단지 템플릿에서 자동 채움. 빈 필드만 덮어쓰고, 사용자가 이미 입력한 값은 보존.
  // 평형은 data.aptType (신규 상담 등록 시 입력값) 우선 사용, 없으면 사용자에게 입력받음.
  const handleAutoFillFromComplex = async () => {
    if (!data.complex) {
      toast.error("단지 정보가 없습니다");
      return;
    }
    let aptType = (data.aptType ?? "").trim();
    if (!aptType) {
      // fallback: 신규 상담 데이터에 평형 정보가 없는 legacy 케이스
      aptType = (window.prompt(
        `[${data.complex}] 평형을 입력하세요 (예: 84A, 59B). 비우면 단지 공통 필드만 채웁니다.`,
        ""
      ) ?? "").trim();
    }
    try {
      const t = await api.resolveComplexTemplate(data.complex, aptType || undefined);
      if (!t) {
        toast.error("단지 템플릿이 등록되지 않았습니다", {
          description: "관리자/팀장 화면에서 [아파트 관리] 또는 [단지 정보]에서 먼저 등록해 주세요.",
        });
        return;
      }
      const filled: string[] = [];
      const next = { ...data };
      const fill = (k: keyof ExecutionData, v: any, label: string) => {
        const cur = (next as any)[k];
        const empty = cur === "" || cur === 0 || cur == null;
        if (v != null && v !== "" && empty) {
          (next as any)[k] = v;
          filled.push(label);
        }
      };
      fill("mgmtFeeBank",     t.mgmt_fee_bank,         "선수관리비 은행");
      fill("mgmtFeeAccount",  t.mgmt_fee_account,      "선수관리비 계좌");
      if (t.matched_mgmt_fee_amount != null) fill("mgmtFee", t.matched_mgmt_fee_amount, `선수관리비 금액(${t.matched_apt_type}평)`);
      fill("stampDuty",       t.stamp_duty,            "인지대");
      fill("optionsBank",     t.general_option_bank,   "유상옵션 은행");
      fill("optionsAccount",  t.general_option_account,"유상옵션 계좌");
      fill("supportCenterPhone", t.mgmt_office_phone,  "관리사무소 전화");
      fill("supportCenterFax",   t.mgmt_office_fax,    "관리사무소 팩스");
      setData(next);
      if (filled.length === 0) {
        toast.info("자동 채움할 빈 필드가 없습니다", { description: "이미 입력된 필드는 덮어쓰지 않습니다." });
      } else {
        toast.success(`${filled.length}개 필드 자동 채움 완료`, { description: filled.join(", ") });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "자동 채움 실패");
    }
  };

  return (
    <div
      className={embedded ? "v4-execution-wizard" : "v4-root v4-execution-wizard"}
      style={
        embedded
          ? {
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "var(--v4-bg-secondary)",
              overflow: "auto",
            }
          : {
              minHeight: "100vh",
              background: "var(--v4-bg-secondary)",
              display: "flex",
              flexDirection: "column",
            }
      }
    >
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { background: #fff !important; overflow: visible !important; }
          /* 임베드 모드(인박스 우측 패널)일 때 좌측 인박스 패널/헤더가 같이 인쇄되는 문제 해결:
             body 의 모든 요소를 숨기고, execution wizard 만 보이게 한 뒤
             absolute 로 좌상단으로 이동시킨다. (position:fixed 는 부모의 transform/overflow
             때문에 막힐 수 있어 visibility 트릭이 더 견고함.) */
          body * { visibility: hidden !important; }
          .v4-execution-wizard, .v4-execution-wizard * { visibility: visible !important; }
          .v4-execution-wizard {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }
          .v4-no-print { display: none !important; }
          .v4-execution-wizard, .v4-execution-wizard * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .v4-execution-wizard main {
            padding: 0 !important;
            max-width: 100% !important;
            gap: 5px !important;
            zoom: 0.78;
          }
          .v4-execution-wizard input, .v4-execution-wizard textarea {
            background: transparent !important;
            border: none !important;
            color: #000 !important;
          }
          .v4-execution-wizard main > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
      <header
        className="v4-no-print"
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--v4-border-tertiary)",
          background: "var(--v4-bg-primary)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        {embedded ? (
          <span />
        ) : (
          <Link
            to="/v4"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: "var(--v4-text-secondary)",
              textDecoration: "none",
              padding: "4px 10px",
              borderRadius: "var(--v4-radius-md)",
            }}
          >
            <ArrowLeft size={13} strokeWidth={1.8} />
            오늘의 리스트
            <Kbd>ESC</Kbd>
          </Link>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5 }}>
          {embedded ? null : (
            <span style={{ color: "var(--v4-text-tertiary)" }}>{savedLabel}</span>
          )}
          <button
            type="button"
            onClick={handleAutoFillFromComplex}
            title="단지 템플릿에서 빈 필드 자동 채움"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              fontSize: 12.5,
              color: "var(--v4-info)",
              background: "var(--v4-bg-info)",
              border: "1px solid #B5CFEB",
              borderRadius: "var(--v4-radius-md)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            <Download size={13} strokeWidth={1.8} />
            단지 정보 자동 채움
          </button>
          <button
            type="button"
            onClick={handlePrint}
            title="A4 인쇄 / PDF로 저장 (Ctrl+P)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              fontSize: 12.5,
              color: "var(--v4-text-secondary)",
              background: "var(--v4-bg-primary)",
              border: "1px solid var(--v4-border-secondary)",
              borderRadius: "var(--v4-radius-md)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          >
            <Printer size={13} strokeWidth={1.8} />
            인쇄·PDF
          </button>
          <button
            type="button"
            onClick={handleExcel}
            title="엑셀(.xlsx) 다운로드"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              fontSize: 12.5,
              color: "#1E7B37",
              background: "#E6F4EA",
              border: "1px solid #B5E0C2",
              borderRadius: "var(--v4-radius-md)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            <FileSpreadsheet size={13} strokeWidth={1.8} />
            Excel
          </button>
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
            }}
          >
            완료 처리
            {embedded ? null : <Kbd>⌘↵</Kbd>}
          </button>
          {embedded ? null : <UserMenu />}
        </div>
      </header>

      {!embedded && <PipelineStrip current={3} caseId={id ?? ""} />}

      <main
        style={{
          flex: 1,
          maxWidth: embedded ? "100%" : 1180,
          width: "100%",
          margin: "0 auto",
          padding: embedded ? "12px 16px 16px" : "12px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Title strip */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "2px 4px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.3px",
                color: "var(--v4-text-primary)",
                margin: 0,
              }}
            >
              {data.complex}
            </h1>
            <span style={{ fontSize: 12.5, color: "var(--v4-text-tertiary)", fontWeight: 500 }}>
              상환조회
            </span>
          </div>
          <span
            style={{
              fontSize: 10.5,
              color: "var(--v4-danger)",
              background: "var(--v4-bg-danger)",
              padding: "2px 8px",
              borderRadius: "var(--v4-radius-sm)",
              fontWeight: 500,
            }}
          >
            {data.dDay}
          </span>
        </div>

        {/* Bank counterpart + support center contact */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
          <Card title="수신 — 담당 은행">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                borderBottom: "1px dashed var(--v4-border-tertiary)",
                fontSize: 12.5,
                minHeight: 26,
              }}
            >
              <Bold>{data.middleBank || "—"}</Bold>
              <input
                type="text"
                value={data.bankBranch}
                onChange={(e) => patch("bankBranch", e.target.value)}
                placeholder="지점"
                style={{ ...cellInputStyle("left"), width: 110, fontWeight: 500 }}
              />
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5, marginLeft: "auto" }}>
                담당자
              </span>
              <input
                type="text"
                value={data.bankContact}
                onChange={(e) => patch("bankContact", e.target.value)}
                placeholder="담당자"
                style={{ ...cellInputStyle("right"), width: 130, fontWeight: 500 }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto 1fr",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                fontSize: 12.5,
                minHeight: 26,
              }}
            >
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>전화</span>
              <input
                type="text"
                value={data.bankPhone}
                onChange={(e) => patch("bankPhone", e.target.value)}
                placeholder="000-0000-0000"
                style={cellInputStyle("left")}
                className="v4-tabular"
              />
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>팩스</span>
              <input
                type="text"
                value={data.bankFax}
                onChange={(e) => patch("bankFax", e.target.value)}
                placeholder="000-0000-0000"
                style={cellInputStyle("right")}
                className="v4-tabular"
              />
            </div>
          </Card>

          <Card title="입주자 지원 연락처">
            <ContactInline
              label="입주지원센터"
              phone={data.supportCenterPhone}
              fax={data.supportCenterFax}
              onPhone={(v) => patch("supportCenterPhone", v)}
              onFax={(v) => patch("supportCenterFax", v)}
              divider
            />
            <ContactInline
              label="잔금조회"
              phone={data.balanceInquiryPhone}
              fax={data.balanceInquiryFax}
              onPhone={(v) => patch("balanceInquiryPhone", v)}
              onFax={(v) => patch("balanceInquiryFax", v)}
            />
          </Card>
        </div>

        {/* Customer + loan info — two cards side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
          <Card>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 60px 1fr",
                alignItems: "center",
                columnGap: 8,
                padding: "4px 0",
                borderBottom: "1px dashed var(--v4-border-tertiary)",
                fontSize: 12.5,
                minHeight: 26,
              }}
            >
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>계약자</span>
              <input
                type="text"
                value={data.customerName}
                onChange={(e) => patch("customerName", e.target.value)}
                style={{ ...cellInputStyle("left"), fontWeight: 600 }}
              />
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>연락처</span>
              <input
                type="text"
                value={data.phone}
                onChange={(e) => patch("phone", e.target.value)}
                placeholder="010-0000-0000"
                className="v4-tabular"
                style={cellInputStyle("right")}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr",
                alignItems: "center",
                columnGap: 8,
                padding: "4px 0",
                fontSize: 12.5,
                minHeight: 26,
              }}
            >
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>동호수</span>
              <input
                type="text"
                value={data.dongHo}
                onChange={(e) => patch("dongHo", e.target.value)}
                style={{ ...cellInputStyle("right"), fontWeight: 500 }}
              />
            </div>
          </Card>
          <Card title="대출 정보">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 60px 1fr",
                alignItems: "center",
                columnGap: 8,
                padding: "4px 0",
                borderBottom: "1px dashed var(--v4-border-tertiary)",
                fontSize: 12.5,
                minHeight: 26,
              }}
            >
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>대출금액</span>
              <MoneyCell value={data.loanAmount} onChange={(n) => patch("loanAmount", n)} />
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>추가대출</span>
              <MoneyCell value={data.additionalLoan} onChange={(n) => patch("additionalLoan", n)} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr",
                alignItems: "center",
                columnGap: 8,
                padding: "4px 0",
                fontSize: 12.5,
                minHeight: 26,
              }}
            >
              <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>실행일</span>
              <input
                type="text"
                value={data.executionDate}
                onChange={(e) => patch("executionDate", e.target.value)}
                style={cellInputStyle("right")}
                className="v4-tabular"
              />
            </div>
          </Card>
        </div>

        {/* 필요자금 banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: required > 0 ? "var(--v4-bg-danger)" : required < 0 ? "var(--v4-bg-success)" : "var(--v4-bg-secondary)",
            border: `1px solid ${required !== 0 ? verdictColor + "33" : "var(--v4-border-tertiary)"}`,
            borderRadius: "var(--v4-radius-md)",
          }}
        >
          <span style={{ fontSize: 13, color: verdictColor, fontWeight: 600, letterSpacing: "-0.2px" }}>
            필요자금
          </span>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="v4-tabular"
              style={{ fontSize: 20, fontWeight: 700, color: verdictColor, letterSpacing: "-0.4px" }}
            >
              {required < 0 ? "-" : ""}
              {fmt(Math.abs(required))}
              <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>원</span>
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                background: verdictColor,
                padding: "2px 8px",
                borderRadius: "var(--v4-radius-sm)",
              }}
            >
              {verdictText}
            </span>
          </span>
        </div>

        {/* Settlement table */}
        <Card title="상환 항목" pad={0}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 150px 260px 180px 1fr",
              columnGap: 16,
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
            <div>구분</div>
            <div>해당은행</div>
            <div>계좌번호</div>
            <div style={{ textAlign: "right" }}>금액</div>
            <div>비고</div>
          </div>

          {ROWS.map((r) => {
            const amount = (data[r.amountKey] as number) ?? 0;
            return (
              <div
                key={r.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 150px 260px 180px 1fr",
                  columnGap: 16,
                  alignItems: "center",
                  padding: "4px 14px",
                  borderBottom: "1px solid var(--v4-border-tertiary)",
                  fontSize: 12.5,
                  minHeight: 30,
                }}
              >
                <div style={{ color: "var(--v4-text-primary)", fontWeight: 500 }}>
                  {r.label}
                </div>
                <CellText
                  value={(data[r.bankKey!] as string) ?? ""}
                  onChange={(v) => patch(r.bankKey!, v as ExecutionData[NonNullable<typeof r.bankKey>])}
                />
                <CellText
                  value={(data[r.accountKey!] as string) ?? ""}
                  onChange={(v) => patch(r.accountKey!, v as ExecutionData[NonNullable<typeof r.accountKey>])}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <CellMoney
                    value={amount}
                    onChange={(n) => patch(r.amountKey, n as ExecutionData[typeof r.amountKey])}
                  />
                </div>
                <div style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>
                  {r.note}
                </div>
              </div>
            );
          })}

          {/* Subtotal row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 150px 260px 180px 1fr",
              columnGap: 16,
              alignItems: "center",
              padding: "8px 14px",
              borderTop: "1px solid var(--v4-border-secondary)",
              background: "var(--v4-bg-secondary)",
              fontSize: 12.5,
            }}
          >
            <div style={{ color: "var(--v4-text-secondary)", fontWeight: 600, gridColumn: "1 / span 3" }}>
              상환 총액
            </div>
            <div className="v4-tabular" style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5 }}>
              {fmt(totalRepayment)}
            </div>
            <div style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
              대출 {fmt(totalLoan)} · 차액 {fmt(required)}
            </div>
          </div>
        </Card>

        {/* Remark */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "76px 1fr",
            gap: 10,
            alignItems: "center",
            padding: "6px 12px",
            background: "var(--v4-bg-primary)",
            border: "1px solid var(--v4-border-tertiary)",
            borderRadius: "var(--v4-radius-md)",
            minHeight: 32,
          }}
        >
          <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)", fontWeight: 600 }}>비 고</span>
          <input
            type="text"
            value={data.remark}
            onChange={(e) => patch("remark", e.target.value)}
            placeholder="당일 입금 일정 등 특이사항"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12.5,
              color: "var(--v4-text-primary)",
              padding: 0,
              fontFamily: "inherit",
            }}
          />
        </div>
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

function DefRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "76px 1fr",
        gap: 10,
        alignItems: "center",
        padding: "3px 0",
        borderBottom: "1px dashed var(--v4-border-tertiary)",
        minHeight: 24,
      }}
    >
      <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}>{label}</span>
      <div style={{ fontSize: 12.5, color: "var(--v4-text-primary)", textAlign: "right" }}>
        {value}
      </div>
    </div>
  );
}

function Bold({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: 600 }}>{children}</span>;
}

function ContactInline({
  label,
  phone,
  fax,
  onPhone,
  onFax,
  divider,
}: {
  label: string;
  phone: string;
  fax: string;
  onPhone: (v: string) => void;
  onFax: (v: string) => void;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px 30px 1fr 30px 1fr",
        alignItems: "center",
        columnGap: 8,
        padding: "4px 0",
        borderBottom: divider ? "1px dashed var(--v4-border-tertiary)" : "none",
        fontSize: 12.5,
        minHeight: 26,
      }}
    >
      <span style={{ color: "var(--v4-text-primary)", fontWeight: 500, fontSize: 12 }}>
        {label}
      </span>
      <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>전화</span>
      <input
        type="text"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
        placeholder="—"
        className="v4-tabular"
        style={cellInputStyle("left")}
      />
      <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>팩스</span>
      <input
        type="text"
        value={fax}
        onChange={(e) => onFax(e.target.value)}
        placeholder="—"
        className="v4-tabular"
        style={cellInputStyle("right")}
      />
    </div>
  );
}

function ContactRow({
  label,
  phone,
  fax,
  onPhone,
  onFax,
}: {
  label: string;
  phone: string;
  fax: string;
  onPhone: (v: string) => void;
  onFax: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr 1fr",
        gap: 6,
        alignItems: "center",
        padding: "3px 0",
        borderBottom: "1px dashed var(--v4-border-tertiary)",
        minHeight: 24,
      }}
    >
      <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}>{label}</span>
      <input
        type="text"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
        placeholder="—"
        className="v4-tabular"
        style={cellInputStyle("right")}
      />
      <input
        type="text"
        value={fax}
        onChange={(e) => onFax(e.target.value)}
        placeholder="—"
        className="v4-tabular"
        style={cellInputStyle("right")}
      />
    </div>
  );
}

function cellInputStyle(align: "left" | "right" = "left"): React.CSSProperties {
  return {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    color: "var(--v4-text-primary)",
    padding: "4px 6px",
    borderRadius: 4,
    fontFamily: "inherit",
    textAlign: align,
  };
}

function CellText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={cellInputStyle("left")}
      onFocus={(e) => (e.target.style.background = "var(--v4-bg-secondary)")}
      onBlur={(e) => (e.target.style.background = "transparent")}
    />
  );
}

function CellMoney({
  value,
  onChange,
  compact,
}: {
  value: number;
  onChange: (n: number) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState(value ? value.toLocaleString("ko-KR") : "");
  useEffect(() => {
    setText(value ? value.toLocaleString("ko-KR") : "");
  }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const cleaned = raw.replace(/[^\d-]/g, "");
        onChange(cleaned ? Number(cleaned) : 0);
      }}
      onBlur={() => setText(value ? value.toLocaleString("ko-KR") : "")}
      onFocus={(e) => (e.target.style.background = "var(--v4-bg-secondary)")}
      onBlurCapture={(e) => (e.target.style.background = "transparent")}
      className="v4-tabular"
      style={{
        ...cellInputStyle("right"),
        width: compact ? 80 : 150,
        fontWeight: 500,
        fontSize: compact ? 12 : 13,
      }}
    />
  );
}

function MoneyCell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end", width: "100%" }}>
      <CellMoney value={value} onChange={onChange} />
      <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>원</span>
    </span>
  );
}
