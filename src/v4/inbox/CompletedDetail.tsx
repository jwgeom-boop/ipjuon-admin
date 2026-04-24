import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RotateCcw, Phone, MessageSquare } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";

function splitAddress(label?: string) {
  if (!label) return { dongHo: "", complex: "" };
  const parts = label.split(/\s*·\s*/);
  return { dongHo: parts[0]?.trim() ?? "", complex: parts[1]?.trim() ?? "" };
}

function formatMoney(n?: number) {
  if (n == null) return "";
  return n.toLocaleString("ko-KR") + "원";
}

function formatMoneyShort(n?: number) {
  if (n == null || n === 0) return "—";
  return n.toLocaleString("ko-KR");
}

function formatDate(s?: string): string {
  if (!s) return "";
  const iso = s.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (iso) return `${parseInt(iso[1], 10)}월 ${parseInt(iso[2], 10)}일`;
  return s;
}

function formatCompletedAt(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

function extractSpouse(internalNote?: string): string | undefined {
  if (!internalNote) return undefined;
  const m = internalNote.match(/배우자[:\s]*([0-9-]+)/);
  return m?.[1];
}

function finalStageLabel(task: TaskItem): string {
  const tag = task.tag ?? "";
  if (tag.includes("실행")) return "실행 완료";
  if (tag.includes("자서")) return "자서 완료";
  if (tag.includes("예약")) return "자서예약 완료";
  if (tag.includes("심사") || tag.includes("상담")) return "상담 완료";
  return "처리 완료";
}

export function CompletedDetail({
  task,
  embed,
  completedAt,
  completedBy,
  onUndoComplete,
  onCall,
  onSms,
}: {
  task: TaskItem;
  embed?: boolean;
  completedAt?: number;
  completedBy?: string;
  onUndoComplete: () => void;
  onCall: () => void;
  onSms: () => void;
}) {
  const { dongHo, complex } = splitAddress(task.addressLabel);
  const spouse = extractSpouse(task.internalNote);
  const customerPhone = task.phones?.[0] ?? task.phone;
  const stageLabel = finalStageLabel(task);
  const completedLabel = completedAt ? formatCompletedAt(completedAt) : "";

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
      {/* Sticky 헤더 — 다른 위저드와 동일 패턴 */}
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
          </Link>
        )}

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
            {task.customerName}
          </strong>
          <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
          <span style={{ color: "var(--v4-text-secondary)" }} className="v4-tabular">
            {dongHo}
          </span>
          {complex ? (
            <>
              <span style={{ color: "var(--v4-text-tertiary)" }}>·</span>
              <span
                style={{
                  color: "var(--v4-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 180,
                }}
                title={complex}
              >
                {complex}
              </span>
            </>
          ) : null}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--v4-text-success)",
              background: "var(--v4-bg-success)",
              padding: "2px 8px",
              borderRadius: "var(--v4-radius-sm)",
              fontWeight: 600,
              marginLeft: 4,
              whiteSpace: "nowrap",
            }}
          >
            <CheckCircle2 size={11} strokeWidth={2.2} />
            {stageLabel}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {completedLabel || completedBy ? (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--v4-text-tertiary)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            완료 {completedLabel}
            {completedBy ? ` · ${completedBy}` : ""}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onUndoComplete}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 12px",
            fontSize: 12.5,
            color: "var(--v4-text-secondary)",
            background: "var(--v4-bg-primary)",
            border: "1px solid var(--v4-border-primary)",
            borderRadius: "var(--v4-radius-md)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <RotateCcw size={12} strokeWidth={1.8} />
          재오픈
        </button>
      </header>

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
            {/* 결과 요약 (큰 숫자) */}
            <Card title="결과 요약">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  padding: "8px 0 4px",
                }}
              >
                <BigStat
                  label="대출 실행액"
                  value={formatMoneyShort(task.loanAmount)}
                  unit="원"
                />
                <BigStat
                  label="실행일"
                  value={formatDate(task.executionDate) || "—"}
                />
                <BigStat
                  label="자서일"
                  value={task.signingDateLabel || "—"}
                />
                <BigStat
                  label="추가대출"
                  value={formatMoneyShort(task.additionalLoan)}
                  unit={task.additionalLoan ? "원" : ""}
                />
              </div>
            </Card>

            {/* 고객 기본 */}
            <Card title="고객 기본">
              <KVRow label="이름" value={task.customerName} />
              {customerPhone ? (
                <KVRow label="고객 연락처" value={customerPhone} mono />
              ) : null}
              {task.phones && task.phones[1] ? (
                <KVRow label="추가 연락처" value={task.phones[1]} mono />
              ) : null}
              {spouse ? <KVRow label="배우자" value={spouse} mono /> : null}
              {task.residentNo ? (
                <KVRow label="주민번호" value={task.residentNo} mono />
              ) : null}
              <KVRow label="동·호수" value={dongHo} mono />
              {task.size ? <KVRow label="타입" value={`${task.size}타입`} /> : null}
              {complex ? <KVRow label="단지" value={complex} /> : null}
            </Card>

            {/* 처리 담당 */}
            <Card title="처리 담당">
              {task.assignee ? <KVRow label="담당자" value={task.assignee} /> : null}
              {task.legalAgent ? <KVRow label="법무사" value={task.legalAgent} /> : null}
              {task.intermediateContact ? (
                <KVRow label="중도금 담당" value={task.intermediateContact} />
              ) : null}
              {!task.assignee && !task.legalAgent && !task.intermediateContact ? (
                <EmptyHint text="담당자 정보 없음" />
              ) : null}
            </Card>
          </aside>

          {/* 우측 컬럼 */}
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 0,
            }}
          >
            {/* 자서·실행 정보 */}
            <Card title="자서 · 실행">
              {task.signingDateLabel ? (
                <KVRow label="자서 일정" value={task.signingDateLabel} />
              ) : null}
              {task.signingPlace ? (
                <KVRow label="자서 장소" value={task.signingPlace} />
              ) : null}
              {task.executionDate ? (
                <KVRow label="실행일" value={formatDate(task.executionDate)} />
              ) : null}
              {task.loanAmount ? (
                <KVRow label="대출액" value={formatMoney(task.loanAmount)} mono />
              ) : null}
              {task.fundsAmount ? (
                <KVRow label="필요자금" value={formatMoney(task.fundsAmount)} mono />
              ) : null}
              {task.intermediatePrincipal ? (
                <KVRow
                  label="중도금 원금"
                  value={formatMoney(task.intermediatePrincipal)}
                  mono
                />
              ) : null}
              {task.intermediateInterest ? (
                <KVRow
                  label="중도금 이자"
                  value={formatMoney(task.intermediateInterest)}
                  mono
                />
              ) : null}
              {task.balconyAmount ? (
                <KVRow label="발코니" value={formatMoney(task.balconyAmount)} mono />
              ) : null}
              {task.optionAmount ? (
                <KVRow label="옵션" value={formatMoney(task.optionAmount)} mono />
              ) : null}
              {task.repayment ? <KVRow label="상환 방식" value={task.repayment} /> : null}
            </Card>

            {/* 통합 메모 */}
            <Card title="메모">
              {task.note ? (
                <MemoBlock label="비고" body={task.note} />
              ) : null}
              {task.nextAction && task.nextAction !== task.note ? (
                <MemoBlock label="처리 항목" body={task.nextAction} />
              ) : null}
              {task.internalNote ? (
                <MemoBlock label="내부 메모" body={task.internalNote} />
              ) : null}
              {!task.note && !task.nextAction && !task.internalNote ? (
                <EmptyHint text="기록된 메모가 없습니다." />
              ) : null}
            </Card>
          </section>
        </div>

        {/* 하단 액션 — 후속 작업 (MVP는 SMS/전화/재오픈) */}
        <div
          style={{
            display: "flex",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--v4-border-tertiary)",
            flexWrap: "wrap",
          }}
        >
          {customerPhone ? (
            <>
              <ActionBtn icon={<Phone size={13} strokeWidth={1.8} />} label="전화" onClick={onCall} />
              <ActionBtn
                icon={<MessageSquare size={13} strokeWidth={1.8} />}
                label="SMS"
                onClick={onSms}
              />
            </>
          ) : null}
          <div style={{ flex: 1 }} />
          <ActionBtn
            icon={<RotateCcw size={13} strokeWidth={1.8} />}
            label="재오픈"
            onClick={onUndoComplete}
            tone="undo"
          />
        </div>
      </main>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────── */

function Card({ title, children }: { title?: string; children: ReactNode }) {
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
      <div style={{ padding: "0 10px 10px" }}>{children}</div>
    </div>
  );
}

function KVRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr",
        alignItems: "center",
        columnGap: 8,
        padding: "5px 0",
        borderBottom: "1px dashed var(--v4-border-tertiary)",
        fontSize: 12.5,
        minHeight: 26,
      }}
    >
      <span style={{ color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>{label}</span>
      <span
        className={mono ? "v4-tabular" : undefined}
        style={{
          color: "var(--v4-text-primary)",
          textAlign: "right",
          padding: "0 4px",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BigStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        background: "var(--v4-bg-secondary)",
        borderRadius: "var(--v4-radius-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          color: "var(--v4-text-tertiary)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>
      <span
        className="v4-tabular"
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--v4-text-primary)",
          letterSpacing: "-0.3px",
          lineHeight: 1.2,
        }}
      >
        {value}
        {unit ? (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--v4-text-tertiary)",
              fontWeight: 400,
              marginLeft: 3,
            }}
          >
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function MemoBlock({ label, body }: { label: string; body: string }) {
  return (
    <div
      style={{
        padding: "6px 0 8px",
        borderBottom: "1px dashed var(--v4-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          color: "var(--v4-text-tertiary)",
          fontWeight: 600,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12.5,
          color: "var(--v4-text-primary)",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "10px 4px",
        textAlign: "center",
        color: "var(--v4-text-tertiary)",
        fontSize: 12,
      }}
    >
      {text}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "undo";
}) {
  const undoStyle =
    tone === "undo"
      ? { color: "var(--v4-text-primary)", borderColor: "var(--v4-border-primary)" }
      : {};
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 14px",
        fontSize: 12.5,
        color: "var(--v4-text-secondary)",
        background: "var(--v4-bg-primary)",
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: "var(--v4-radius-md)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 500,
        ...undoStyle,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
