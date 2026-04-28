import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Circle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import {
  getSigningFixture,
  DOCUMENT_CATEGORY_LABEL,
  type DocStatus,
  type DocumentItem,
  type DocumentCategory,
  type SignItem,
  type SigningData,
} from "../wizard/signingFixtures";
import { useWizardDraft } from "../wizard/useWizardDraft";
import { PipelineStrip } from "../wizard/PipelineStrip";
import { getReservationHandoff } from "../wizard/reservationHandoff";
import { UserMenu } from "../auth/UserMenu";
import { api } from "@/lib/api";
import { signingToBackend } from "../data/wizardPersistence";
import { useWizardAutosave } from "../data/useWizardAutosave";

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

type SigningWizardProps = {
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

export default function SigningWizard({
  embed,
  embedId,
  embedTask,
  onEmbedComplete,
}: SigningWizardProps = {}) {
  const params = useParams<{ id: string }>();
  const id = embedId ?? params.id;
  const navigate = useNavigate();
  const seed = taskToSeed(embedTask);
  const { data, setData, savedAt, clearDraft } = useWizardDraft<SigningData>(
    "signing",
    id ?? "",
    (rawId) => {
      const base = getSigningFixture(rawId, seed);
      const handoff = getReservationHandoff(rawId);
      if (!handoff) return base;
      return {
        ...base,
        signingDate: handoff.signingDate || base.signingDate,
        signingTime: handoff.signingTime || base.signingTime,
        signingLocation: handoff.signingLocation || base.signingLocation,
        // 자서예약 단계의 비고를 자서 비고 앞에 흡수 (중복 방지)
        remark:
          handoff.remark && !base.remark.includes(handoff.remark)
            ? base.remark
              ? `${handoff.remark} / ${base.remark}`
              : handoff.remark
            : base.remark,
      };
    },
    seed as Partial<SigningData> | undefined
  );

  const patch = <K extends keyof SigningData>(k: K, v: SigningData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const { isPersistableId } = useWizardAutosave(id, data, signingToBackend);

  const updateDoc = (idx: number, fields: Partial<DocumentItem>) =>
    setData((d) => ({
      ...d,
      documents: d.documents.map((doc, i) => (i === idx ? { ...doc, ...fields } : doc)),
    }));

  const updateSign = (idx: number, fields: Partial<SignItem>) =>
    setData((d) => ({
      ...d,
      signItems: d.signItems.map((s, i) => (i === idx ? { ...s, ...fields } : s)),
    }));

  const docTotals = useMemo(() => {
    const required = data.documents.filter((d) => d.required);
    const ready = required.filter((d) => d.status === "received").length;
    const missing = required.filter((d) => d.status === "missing").length;
    return { ready, total: required.length, missing };
  }, [data.documents]);

  const signTotals = useMemo(() => {
    const done = data.signItems.filter((s) => s.signed).length;
    return { done, total: data.signItems.length };
  }, [data.signItems]);

  const docsReady = docTotals.ready === docTotals.total && docTotals.missing === 0;
  const signDone = signTotals.done === signTotals.total;

  const verdict: { tone: "danger" | "warning" | "success"; text: string } = !docsReady
    ? { tone: "danger", text: "서류 미비" }
    : !signDone
    ? { tone: "warning", text: "자서 진행 중" }
    : { tone: "success", text: "자서 완료" };

  const verdictColor =
    verdict.tone === "danger"
      ? "var(--v4-danger)"
      : verdict.tone === "warning"
      ? "var(--v4-warning)"
      : "var(--v4-success)";

  const verdictBg =
    verdict.tone === "danger"
      ? "var(--v4-bg-danger)"
      : verdict.tone === "warning"
      ? "var(--v4-bg-warning)"
      : "var(--v4-bg-success)";

  const complete = async () => {
    if (!signDone) {
      const ok = window.confirm("자서가 완료되지 않은 항목이 있습니다. 그래도 종료할까요?");
      if (!ok) return;
    }
    if (id) {
      if (isPersistableId) {
        try { await api.updateBankConsultation(id, signingToBackend(data)); }
        catch (e) { console.warn("[updateBankConsultation]", e); }
      }
      try { await api.updateBankStatus(id, "executing"); } catch (e) { console.warn("[updateBankStatus]", e); }
    }
    toast.success("자서 처리됨", { description: `${data.customerName} 고객` });
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
        {embed ? (
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
          {embed ? null : (
            <span style={{ color: "var(--v4-text-tertiary)" }}>{savedLabel}</span>
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
            }}
          >
            완료 처리
            {embed ? null : <Kbd>⌘↵</Kbd>}
          </button>
          {embed ? null : <UserMenu />}
        </div>
      </header>

      {embed ? null : <PipelineStrip current={2} caseId={id ?? ""} />}

      <main
        style={{
          flex: 1,
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          padding: "12px 20px 32px",
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
              자서접수
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

        {/* Customer + signing schedule */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
          <Card>
            <RowGrid cols="60px 1fr 60px 1fr" divider>
              <Label>계약자</Label>
              <Input value={data.customerName} onChange={(v) => patch("customerName", v)} bold />
              <Label>연락처</Label>
              <Input value={data.phone} onChange={(v) => patch("phone", v)} tabular align="right" />
            </RowGrid>
            <RowGrid cols="60px 1fr">
              <Label>동호수</Label>
              <Input value={data.dongHo} onChange={(v) => patch("dongHo", v)} align="right" medium />
            </RowGrid>
          </Card>
          <Card title="자서 일정">
            <RowGrid cols="60px 1fr 60px 1fr" divider>
              <Label>일자</Label>
              <Input value={data.signingDate} onChange={(v) => patch("signingDate", v)} tabular />
              <Label>시간</Label>
              <Input value={data.signingTime} onChange={(v) => patch("signingTime", v)} tabular align="right" />
            </RowGrid>
            <RowGrid cols="60px 1fr">
              <Label>장소</Label>
              <Input value={data.signingLocation} onChange={(v) => patch("signingLocation", v)} align="right" />
            </RowGrid>
          </Card>
        </div>

        {/* Bank + loan */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
          <Card title="담당 은행">
            <RowGrid cols="60px 1fr 60px 1fr" divider>
              <Label>지점</Label>
              <Input value={data.bankBranch} onChange={(v) => patch("bankBranch", v)} medium />
              <Label>담당자</Label>
              <Input value={data.bankContact} onChange={(v) => patch("bankContact", v)} align="right" medium />
            </RowGrid>
            <RowGrid cols="60px 1fr">
              <Label>전화</Label>
              <Input value={data.bankPhone} onChange={(v) => patch("bankPhone", v)} tabular align="right" />
            </RowGrid>
          </Card>
          <Card title="대출 정보">
            <RowGrid cols="60px 1fr 60px 1fr" divider>
              <Label>대출금액</Label>
              <MoneyCell value={data.loanAmount} onChange={(n) => patch("loanAmount", n)} />
              <Label>추가대출</Label>
              <MoneyCell value={data.additionalLoan} onChange={(n) => patch("additionalLoan", n)} />
            </RowGrid>
            <RowGrid cols="60px 1fr">
              <Label>실행예정</Label>
              <Input
                value={data.scheduledExecutionDate}
                onChange={(v) => patch("scheduledExecutionDate", v)}
                tabular
                align="right"
              />
            </RowGrid>
          </Card>
        </div>

        {/* Verdict banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: verdictBg,
            border: `1px solid ${verdictColor}33`,
            borderRadius: "var(--v4-radius-md)",
          }}
        >
          <span style={{ fontSize: 13, color: verdictColor, fontWeight: 600, letterSpacing: "-0.2px" }}>
            자서 진행 상태
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--v4-text-secondary)" }}>
              서류 <strong className="v4-tabular">{docTotals.ready}/{docTotals.total}</strong>
              {docTotals.missing > 0 ? (
                <span style={{ marginLeft: 6, color: "var(--v4-danger)" }}>· 누락 {docTotals.missing}</span>
              ) : null}
            </span>
            <span style={{ fontSize: 12, color: "var(--v4-text-secondary)" }}>
              서명 <strong className="v4-tabular">{signTotals.done}/{signTotals.total}</strong>
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
              {verdict.text}
            </span>
          </span>
        </div>

        {/* Documents table — 카테고리별 그룹 + 매수/발급처 컬럼 */}
        <Card title={`지참 서류 (${docTotals.ready}/${docTotals.total})`} pad={0}>
          <TableHeader cols="40px 1.4fr 50px 50px 130px 1fr 95px">
            <span></span>
            <span>서류명</span>
            <span style={{ textAlign: "center" }}>필수</span>
            <span style={{ textAlign: "center" }}>매수</span>
            <span>발급처</span>
            <span>비고</span>
            <span style={{ textAlign: "center" }}>상태</span>
          </TableHeader>
          {(() => {
            const ORDER: Array<DocumentCategory> = [
              "공통", "소득_재직자", "소득_사업자", "소득_기타", "배우자_재직자", "배우자_사업자",
            ];
            const elements: React.ReactNode[] = [];
            // 글로벌 인덱스 추적 (updateDoc 가 doc 의 위치 인덱스 사용)
            let globalIdx = 0;
            const docsWithIndex = data.documents.map((d, i) => ({ doc: d, i }));
            // 카테고리별 그룹
            ORDER.forEach(cat => {
              const items = docsWithIndex.filter(({ doc }) => (doc.category ?? "공통") === cat);
              if (items.length === 0) return;
              elements.push(
                <div key={`hdr-${cat}`} style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: cat.startsWith("배우자") ? "#7c2d12" : cat.startsWith("소득") ? "#1d4ed8" : "var(--v4-text-secondary)",
                  background: "var(--v4-bg-secondary)",
                  borderBottom: "1px solid var(--v4-border-tertiary)",
                }}>
                  {DOCUMENT_CATEGORY_LABEL[cat]}
                  {(cat === "소득_재직자" || cat === "소득_사업자" || cat === "소득_기타") && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: "var(--v4-text-tertiary)" }}>· 택1</span>
                  )}
                </div>
              );
              items.forEach(({ doc, i }) => {
                elements.push(
                  <div
                    key={doc.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1.4fr 50px 50px 130px 1fr 95px",
                      columnGap: 12,
                      alignItems: "center",
                      padding: "4px 14px",
                      borderBottom: "1px solid var(--v4-border-tertiary)",
                      fontSize: 12.5,
                      minHeight: 32,
                      background: doc.status === "missing" ? "var(--v4-bg-danger)" : "transparent",
                    }}
                  >
                    <StatusToggle
                      status={doc.status}
                      onChange={(s) => updateDoc(i, { status: s })}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <Input
                        value={doc.name}
                        onChange={(v) => updateDoc(i, { name: v })}
                        medium
                      />
                      {doc.isOriginal && (
                        <span style={{
                          flexShrink: 0,
                          padding: "1px 5px",
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: "#dc2626",
                          background: "#fee2e2",
                          borderRadius: 3,
                        }}>원본</span>
                      )}
                    </div>
                    <span style={{ textAlign: "center", fontSize: 11, color: doc.required ? "var(--v4-danger)" : "var(--v4-text-tertiary)", fontWeight: 600 }}>
                      {doc.required ? "필수" : "선택"}
                    </span>
                    <span style={{ textAlign: "center", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {doc.copies ?? "-"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--v4-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.issuer ?? "-"}
                    </span>
                    <Input
                      value={doc.note ?? ""}
                      onChange={(v) => updateDoc(i, { note: v })}
                      placeholder="—"
                      tertiary
                    />
                    <StatusBadge status={doc.status} />
                  </div>
                );
                globalIdx++;
              });
            });
            // 카테고리 없는 레거시 항목
            const uncategorized = docsWithIndex.filter(({ doc }) => !doc.category);
            uncategorized.forEach(({ doc, i }) => {
              elements.push(
                <div
                  key={doc.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1.4fr 50px 50px 130px 1fr 95px",
                    columnGap: 12,
                    alignItems: "center",
                    padding: "4px 14px",
                    borderBottom: "1px solid var(--v4-border-tertiary)",
                    fontSize: 12.5,
                    minHeight: 32,
                  }}
                >
                  <StatusToggle status={doc.status} onChange={(s) => updateDoc(i, { status: s })} />
                  <Input value={doc.name} onChange={(v) => updateDoc(i, { name: v })} medium />
                  <span style={{ textAlign: "center", fontSize: 11, color: doc.required ? "var(--v4-danger)" : "var(--v4-text-tertiary)", fontWeight: 600 }}>
                    {doc.required ? "필수" : "선택"}
                  </span>
                  <span style={{ textAlign: "center", fontSize: 12, fontWeight: 600 }}>{doc.copies ?? "-"}</span>
                  <span style={{ fontSize: 11, color: "var(--v4-text-secondary)" }}>{doc.issuer ?? "-"}</span>
                  <Input value={doc.note ?? ""} onChange={(v) => updateDoc(i, { note: v })} placeholder="—" tertiary />
                  <StatusBadge status={doc.status} />
                </div>
              );
            });
            return elements;
          })()}
        </Card>

        {/* Sign items */}
        <Card title={`서명 항목 (${signTotals.done}/${signTotals.total})`} pad={0}>
          <TableHeader cols="40px 1fr 1fr 110px">
            <span></span>
            <span>서류명</span>
            <span>비고</span>
            <span style={{ textAlign: "center" }}>서명</span>
          </TableHeader>
          {data.signItems.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 110px",
                columnGap: 16,
                alignItems: "center",
                padding: "4px 14px",
                borderBottom: "1px solid var(--v4-border-tertiary)",
                fontSize: 12.5,
                minHeight: 32,
                background: s.signed ? "var(--v4-bg-success)" : "transparent",
                opacity: s.signed ? 0.85 : 1,
              }}
            >
              <SignToggle
                signed={s.signed}
                onChange={(b) => updateSign(i, { signed: b })}
              />
              <Input
                value={s.name}
                onChange={(v) => updateSign(i, { name: v })}
                medium
              />
              <Input
                value={s.note ?? ""}
                onChange={(v) => updateSign(i, { note: v })}
                placeholder="—"
                tertiary
              />
              <span
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: s.signed ? "var(--v4-success)" : "var(--v4-text-tertiary)",
                  fontWeight: 600,
                }}
              >
                {s.signed ? "완료" : "대기"}
              </span>
            </div>
          ))}
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
            placeholder="당일 일정·특이사항"
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

        {/* Loan amount summary footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            padding: "4px 4px",
            fontSize: 11,
            color: "var(--v4-text-tertiary)",
          }}
        >
          <span>
            대출 합계 <strong className="v4-tabular" style={{ color: "var(--v4-text-secondary)" }}>{fmt(data.loanAmount + data.additionalLoan)}</strong>원
          </span>
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tabular?: boolean;
  align?: "left" | "right";
  bold?: boolean;
  medium?: boolean;
  tertiary?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={tabular ? "v4-tabular" : undefined}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: 13,
        color: tertiary ? "var(--v4-text-tertiary)" : "var(--v4-text-primary)",
        padding: "4px 6px",
        borderRadius: 4,
        fontFamily: "inherit",
        textAlign: align,
        fontWeight: bold ? 600 : medium ? 500 : 400,
      }}
      onFocus={(e) => (e.target.style.background = "var(--v4-bg-secondary)")}
      onBlur={(e) => (e.target.style.background = "transparent")}
    />
  );
}

function MoneyCell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(value ? value.toLocaleString("ko-KR") : "");
  useEffect(() => {
    setText(value ? value.toLocaleString("ko-KR") : "");
  }, [value]);
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end", width: "100%" }}>
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
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 13,
          color: "var(--v4-text-primary)",
          padding: "4px 6px",
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
      {children}
    </div>
  );
}

function StatusToggle({ status, onChange }: { status: DocStatus; onChange: (s: DocStatus) => void }) {
  const cycle: Record<DocStatus, DocStatus> = {
    pending: "received",
    received: "missing",
    missing: "pending",
  };
  const icon =
    status === "received" ? (
      <Check size={14} strokeWidth={2.5} color="var(--v4-success)" />
    ) : status === "missing" ? (
      <AlertTriangle size={14} strokeWidth={2} color="var(--v4-danger)" />
    ) : (
      <Circle size={13} strokeWidth={1.5} color="var(--v4-text-tertiary)" />
    );
  return (
    <button
      type="button"
      onClick={() => onChange(cycle[status])}
      title="클릭하여 상태 변경 (대기 → 접수 → 누락)"
      style={{
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: 6,
        cursor: "pointer",
        padding: 0,
      }}
    >
      {icon}
    </button>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, { text: string; color: string; bg: string }> = {
    pending: { text: "대기", color: "var(--v4-text-tertiary)", bg: "transparent" },
    received: { text: "접수", color: "var(--v4-success)", bg: "var(--v4-bg-success)" },
    missing: { text: "누락", color: "var(--v4-danger)", bg: "var(--v4-bg-danger)" },
  };
  const m = map[status];
  return (
    <span style={{ display: "inline-flex", justifyContent: "center" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: m.color,
          background: m.bg,
          padding: "2px 8px",
          borderRadius: "var(--v4-radius-sm)",
        }}
      >
        {m.text}
      </span>
    </span>
  );
}

function SignToggle({ signed, onChange }: { signed: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!signed)}
      style={{
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: signed ? "var(--v4-success)" : "transparent",
        border: signed ? "1px solid var(--v4-success)" : "1px solid var(--v4-border-tertiary)",
        borderRadius: 6,
        cursor: "pointer",
        padding: 0,
      }}
    >
      {signed ? <Check size={14} strokeWidth={3} color="#fff" /> : null}
    </button>
  );
}
