import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, Copy, Check, RotateCcw, X, MessageSquare } from "lucide-react";
import SigningSlotInline from "../inbox/SigningSlotInline";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import {
  getReservationFixture,
  getRecentLocations,
  pushRecentLocation,
  DOC_CATEGORY_LABEL,
  type ReservationData,
  type ReservationDoc,
  type ReservationDocCategory,
} from "../wizard/reservationFixtures";
import { getAllSigningFixtures } from "../wizard/signingFixtures";
import { useWizardDraft } from "../wizard/useWizardDraft";
import { PipelineStrip } from "../wizard/PipelineStrip";
import { saveReservationHandoff } from "../wizard/reservationHandoff";
import { UserMenu } from "../auth/UserMenu";
import { api } from "@/lib/api";
import { reservationToBackend } from "../data/wizardPersistence";
import { useWizardAutosave } from "../data/useWizardAutosave";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatKoreanDate(iso: string) {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const d = new Date(`${iso}T00:00:00`);
  const wd = WEEKDAY_LABELS[d.getDay()];
  return `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 (${wd})`;
}

function formatSmsDate(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const d = new Date(`${iso}T00:00:00`);
  const wd = WEEKDAY_LABELS[d.getDay()];
  return `${m[1]}년 ${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 (${wd})`;
}

function formatSmsTime(hhmm: string) {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return mm === 0 ? `${ampm} ${h12}시` : `${ampm} ${h12}시 ${mm}분`;
}

function makeMonthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const days: Date[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, i - startWeekday + 1);
    days.push(d);
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) {
    const lastDate = days[days.length - 1];
    const next = new Date(lastDate);
    next.setDate(lastDate.getDate() + 1);
    days.push(next);
  }
  return days;
}

const SECTION_STYLE = {
  background: "var(--v4-bg-primary)",
  border: "1px solid var(--v4-border-tertiary)",
  borderRadius: 10,
  padding: 14,
};

const SECTION_TITLE_STYLE = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--v4-text-secondary)",
  letterSpacing: "-0.1px",
  marginBottom: 10,
};

const INPUT_STYLE = {
  width: "100%",
  height: 30,
  padding: "0 10px",
  fontSize: 12.5,
  border: "1px solid var(--v4-border-secondary)",
  borderRadius: 6,
  background: "var(--v4-bg-primary)",
  color: "var(--v4-text-primary)",
  fontFamily: "inherit" as const,
  boxSizing: "border-box" as const,
};

const LABEL_STYLE = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 500,
  color: "var(--v4-text-tertiary)",
  marginBottom: 4,
};

/** 카테고리별로 필요서류를 묶어 표 형식으로 렌더 (편집 가능) */
function DocumentsTable({ docs, onChange }: {
  docs: ReservationDoc[];
  onChange?: (docs: ReservationDoc[]) => void;
}) {
  const editable = !!onChange;

  // 카테고리 순서 보장
  const ORDER: ReservationDocCategory[] = [
    "공통",
    "소득_재직자",
    "소득_사업자",
    "소득_기타",
    "배우자_재직자",
    "배우자_사업자",
  ];

  const grouped = ORDER.map(cat => ({
    cat,
    items: docs.filter(d => (d.category ?? "공통") === cat),
  })).filter(g => g.items.length > 0 || editable);

  const updateDoc = (id: string, patch: Partial<ReservationDoc>) => {
    if (!onChange) return;
    onChange(docs.map(d => d.id === id ? { ...d, ...patch } : d));
  };
  const deleteDoc = (id: string) => {
    if (!onChange) return;
    if (!confirm("이 서류를 삭제할까요?")) return;
    onChange(docs.filter(d => d.id !== id));
  };
  const addDoc = (cat: ReservationDocCategory) => {
    if (!onChange) return;
    const newDoc: ReservationDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      copies: 1,
      issuer: "",
      category: cat,
    };
    onChange([...docs, newDoc]);
  };

  const inputBase = {
    width: "100%",
    padding: "4px 6px",
    border: "1px solid var(--v4-border-secondary)",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
    background: "white",
  };

  const renderTable = (items: ReservationDoc[], cat?: ReservationDocCategory) => (
    <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
      <thead>
        <tr style={{ background: "var(--v4-bg-secondary)", color: "var(--v4-text-tertiary)" }}>
          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--v4-border-tertiary)" }}>서류</th>
          <th style={{ padding: "6px 4px", width: 50, textAlign: "center", fontWeight: 600, borderBottom: "1px solid var(--v4-border-tertiary)" }}>매수</th>
          <th style={{ padding: "6px 8px", width: 130, textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--v4-border-tertiary)" }}>발급처</th>
          {editable && <th style={{ width: 28, borderBottom: "1px solid var(--v4-border-tertiary)" }} />}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={editable ? 4 : 3} style={{ padding: 8, textAlign: "center", color: "var(--v4-text-tertiary)", fontSize: 11.5 }}>
              항목 없음
            </td>
          </tr>
        )}
        {items.map(doc => (
          <tr key={doc.id} style={{ borderBottom: "1px solid var(--v4-border-tertiary)" }}>
            <td style={{ padding: "6px 8px", verticalAlign: "top" as const, lineHeight: 1.4 }}>
              {editable ? (
                <>
                  <input
                    type="text"
                    value={doc.name}
                    onChange={(e) => updateDoc(doc.id, { name: e.target.value })}
                    placeholder="서류명"
                    style={{ ...inputBase, fontWeight: 500 }}
                  />
                  <input
                    type="text"
                    value={doc.note ?? ""}
                    onChange={(e) => updateDoc(doc.id, { note: e.target.value || undefined })}
                    placeholder="비고 (선택)"
                    style={{ ...inputBase, marginTop: 3, fontSize: 11, color: "var(--v4-text-tertiary)" }}
                  />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 10.5, color: "var(--v4-text-secondary)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!doc.isOriginal}
                      onChange={(e) => updateDoc(doc.id, { isOriginal: e.target.checked || undefined })}
                      style={{ margin: 0 }}
                    />
                    원본 필수
                  </label>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 500, color: "var(--v4-text-primary)" }}>{doc.name}</span>
                  {doc.isOriginal && (
                    <span style={{ marginLeft: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 3 }}>원본</span>
                  )}
                  {doc.note && (
                    <div style={{ fontSize: 11, color: "var(--v4-text-tertiary)", marginTop: 2 }}>— {doc.note}</div>
                  )}
                </>
              )}
            </td>
            <td style={{ padding: "6px 4px", textAlign: "center", verticalAlign: "top" as const, fontVariantNumeric: "tabular-nums" as const, fontWeight: 600 }}>
              {editable ? (
                <input
                  type="number"
                  min={0}
                  value={doc.copies ?? 0}
                  onChange={(e) => updateDoc(doc.id, { copies: e.target.value === "" ? undefined : Number(e.target.value) })}
                  style={{ ...inputBase, textAlign: "center", padding: "4px 2px" }}
                />
              ) : (doc.copies ?? "-")}
            </td>
            <td style={{ padding: "6px 8px", verticalAlign: "top" as const, color: "var(--v4-text-secondary)", fontSize: 11.5 }}>
              {editable ? (
                <input
                  type="text"
                  value={doc.issuer ?? ""}
                  onChange={(e) => updateDoc(doc.id, { issuer: e.target.value || undefined })}
                  placeholder="발급처"
                  style={inputBase}
                />
              ) : (doc.issuer ?? "-")}
            </td>
            {editable && (
              <td style={{ padding: "6px 2px", verticalAlign: "top" as const }}>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  title="삭제"
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 6px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <X size={11} />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <p style={{
            margin: "0 0 6px 0",
            fontSize: 11.5,
            fontWeight: 700,
            color: cat.startsWith("배우자") ? "#7c2d12" : cat.startsWith("소득") ? "#1d4ed8" : "var(--v4-text-primary)",
          }}>
            {DOC_CATEGORY_LABEL[cat]}
            {(cat === "소득_재직자" || cat === "소득_사업자" || cat === "소득_기타") && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: "var(--v4-text-tertiary)" }}>· 소득 유형 택1</span>
            )}
          </p>
          {renderTable(items, cat)}
          {editable && (
            <button
              onClick={() => addDoc(cat)}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "5px 8px",
                background: "white",
                border: "1px dashed var(--v4-border-secondary)",
                borderRadius: 4,
                fontSize: 11.5,
                color: "var(--v4-text-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + 행 추가
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

type ReservationWizardProps = {
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

export default function ReservationWizard({
  embed,
  embedId,
  embedTask,
  onEmbedComplete,
}: ReservationWizardProps = {}) {
  const params = useParams<{ id: string }>();
  const id = embedId ?? params.id;
  const navigate = useNavigate();
  const seed = taskToSeed(embedTask);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  // B2C 캘린더 상태 — 기존 자서일 선택 캘린더와 통합
  const [b2cExcludedDates, setB2cExcludedDates] = useState<Set<string>>(new Set());
  const [b2cExcludeMode, setB2cExcludeMode] = useState(false);  // 토글: ON 이면 클릭 = 제외 토글

  const toggleB2cExcluded = (iso: string) => {
    setB2cExcludedDates(prev => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso); else next.add(iso);
      return next;
    });
  };

  /** 깔끔한 인쇄용 HTML 을 새 창에 띄워서 인쇄 — window.print() 가 화면 전체 인쇄하는 문제 회피 */
  const printDocs = () => {
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;

    const ORDER: ReservationDocCategory[] = [
      "공통", "소득_재직자", "소득_사업자", "소득_기타", "배우자_재직자", "배우자_사업자",
    ];
    const groups = ORDER
      .map(cat => ({ cat, items: data.documents.filter(d => (d.category ?? "공통") === cat) }))
      .filter(g => g.items.length > 0);

    const escape = (s: string) => s.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] || c));

    const groupHtml = groups.map(({ cat, items }) => `
      <h3 class="cat ${cat.startsWith("배우자") ? "sp" : cat.startsWith("소득") ? "income" : ""}">${escape(DOC_CATEGORY_LABEL[cat])}${(cat === "소득_재직자" || cat === "소득_사업자" || cat === "소득_기타") ? ' <span class="hint">· 택1</span>' : ""}</h3>
      <table>
        <thead>
          <tr><th class="name">서류</th><th class="copies">매수</th><th class="issuer">발급처</th></tr>
        </thead>
        <tbody>
          ${items.map(d => `
            <tr>
              <td>
                <div class="doc-name">${escape(d.name)}${d.isOriginal ? ' <span class="orig">[원본]</span>' : ""}</div>
                ${d.note ? `<div class="note">— ${escape(d.note)}</div>` : ""}
              </td>
              <td class="copies">${d.copies ?? "-"}</td>
              <td>${escape(d.issuer ?? "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>당사자 준비서류 LIST - ${escape(data.customerName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; margin: 28px 32px; color: #111827; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .sub { font-size: 12px; color: #6b7280; margin: 0 0 16px 0; }
    .info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 16px; padding: 10px 12px; background: #f9fafb; border-radius: 6px; font-size: 12px; margin-bottom: 18px; }
    .info dt { color: #6b7280; font-weight: 400; }
    .info dd { margin: 0 0 4px 0; font-weight: 600; }
    h3.cat { font-size: 13px; font-weight: 700; margin: 18px 0 6px 0; color: #111827; }
    h3.cat.income { color: #1d4ed8; }
    h3.cat.sp { color: #7c2d12; }
    h3.cat .hint { font-size: 10px; font-weight: 600; color: #9ca3af; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #f3f4f6; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th { font-weight: 600; color: #6b7280; font-size: 11px; }
    th.copies, td.copies { width: 50px; text-align: center; }
    th.issuer, td.issuer { width: 150px; }
    .doc-name { font-weight: 500; }
    .note { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .orig { display: inline-block; padding: 0 4px; font-size: 9.5px; font-weight: 700; color: #dc2626; background: #fee2e2; border-radius: 3px; vertical-align: middle; }
    .warn { margin-top: 18px; padding: 10px 12px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 11.5px; line-height: 1.6; }
    .warn b { color: #92400e; }
    @media print { body { margin: 16px 18px; } @page { size: A4; margin: 14mm; } }
  </style>
</head>
<body>
  <h1>📋 당사자 준비서류 LIST</h1>
  <p class="sub">자서 당일 지참 · 차주·담보제공자 각 1세트</p>

  <dl class="info">
    <div><dt>계약자</dt><dd>${escape(data.customerName)}</dd></div>
    <div><dt>단지</dt><dd>${escape(data.complex || "-")}</dd></div>
    <div><dt>동·호</dt><dd>${escape(data.dongHo || "-")}</dd></div>
    <div><dt>자서일</dt><dd>${escape(data.signingDate || "-")} ${escape(data.signingTime || "")}</dd></div>
  </dl>

  ${groupHtml}

  <div class="warn">
    <b>⚠️ 주의사항</b><br>
    1. 모든 서류 상 주민등록 뒷 번호 필수 공개<br>
    2. 발급 매수 확인<br>
    3. 초본 — 원초본 / 신분증이 없는 미성년 자녀가 계실 경우, 기본증명서(상세)로 발급
  </div>

  <script>
    window.addEventListener("load", function() {
      setTimeout(function() { window.focus(); window.print(); }, 200);
    });
  </script>
</body>
</html>`;

    w.document.write(html);
    w.document.close();
  };
  const { data, setData, savedAt, clearDraft } = useWizardDraft<ReservationData>(
    "reservation",
    id ?? "",
    (rawId) => getReservationFixture(rawId, seed),
    seed as Partial<ReservationData> | undefined,
  );

  const patch = <K extends keyof ReservationData>(k: K, v: ReservationData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const { isPersistableId } = useWizardAutosave(id, data, reservationToBackend);

  const allSignings = useMemo(() => getAllSigningFixtures(), []);

  // Calendar state — defaults to month of selected signingDate or today
  const initial = data.signingDate
    ? new Date(`${data.signingDate}T00:00:00`)
    : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const monthMatrix = useMemo(
    () => makeMonthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // Build map of date -> count of existing 자서예약
  const bookingsByDate = useMemo(() => {
    const m = new Map<string, typeof allSignings>();
    allSignings.forEach((s) => {
      if (!s.signingDate) return;
      const arr = m.get(s.signingDate) ?? [];
      arr.push(s);
      m.set(s.signingDate, arr);
    });
    return m;
  }, [allSignings]);

  const selectedBookings = data.signingDate
    ? bookingsByDate.get(data.signingDate) ?? []
    : [];

  const myBranchLabel = data.bankBranchLabel.trim();

  // 충돌: 같은 날짜 + (같은 장소 라벨) 에 다른 예약이 있으면 표시
  const conflicts = useMemo(() => {
    if (!data.signingDate) return [];
    const myLabel =
      data.location.kind === "bank"
        ? myBranchLabel
        : (data.location.customLabel ?? "").trim();
    if (!myLabel) return [];
    return selectedBookings.filter(
      (b) =>
        b.id !== data.id && (b.signingLocation ?? "").trim() === myLabel,
    );
  }, [
    data.signingDate,
    data.location.kind,
    data.location.customLabel,
    myBranchLabel,
    selectedBookings,
    data.id,
  ]);

  const [recents, setRecents] = useState<string[]>(() => getRecentLocations());
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [smsDraft, setSmsDraft] = useState("");

  const buildSmsText = (): string => {
    const dateLabel = data.signingDate ? formatSmsDate(data.signingDate) : "(미정)";
    const timeLabel = data.signingTime ? formatSmsTime(data.signingTime) : "";
    const locationLabel =
      data.location.kind === "bank"
        ? data.bankBranchLabel
        : data.location.customLabel ?? "";
    const dongHoLabel = data.dongHo ? ` ${data.dongHo}` : "";
    const complexLine = data.complex
      ? `${data.complex}${dongHoLabel} 자서 일정 안내드립니다.`
      : "자서 일정 안내드립니다.";
    const greeting = data.customerName
      ? `${data.customerName} 고객님, 안녕하세요.`
      : "고객님, 안녕하세요.";

    const lines: string[] = [];
    lines.push("[자서 일정 안내]");
    lines.push(greeting);
    lines.push(complexLine);
    lines.push("");
    lines.push(`■ 일시: ${dateLabel}${timeLabel ? ` ${timeLabel}` : ""}`);
    lines.push(`■ 장소: ${locationLabel || "(미정)"}`);
    if (data.spouseAccompany) {
      lines.push("■ 동석: 배우자 동반 부탁드립니다");
    }
    lines.push("");
    lines.push("■ 구비서류 (당일 지참)");
    data.documents.forEach((doc, i) => {
      const note = doc.note ? ` — ${doc.note}` : "";
      lines.push(`${i + 1}. ${doc.name}${note}`);
    });
    lines.push("");
    lines.push("※ 인감도장 누락 시 자서 진행이 어렵습니다. 꼭 지참 부탁드립니다.");
    lines.push("※ 일정 변경 필요 시 회신 부탁드립니다.");
    return lines.join("\n");
  };

  const openSmsPreview = () => {
    if (!data.signingDate || !data.signingTime) {
      toast.warning("자서일과 시간을 먼저 입력해 주세요.");
      return;
    }
    const locationLabel =
      data.location.kind === "bank"
        ? data.bankBranchLabel
        : (data.location.customLabel ?? "").trim();
    if (!locationLabel.trim()) {
      toast.warning("자서장소를 먼저 입력해 주세요.");
      return;
    }
    setSmsDraft(buildSmsText());
    setCopyState("idle");
    setPreviewOpen(true);
  };

  const copyDraftToClipboard = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(smsDraft);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
      copied = true;
    } catch {
      window.prompt("복사 실패 — 아래 텍스트를 직접 선택해 복사해 주세요:", smsDraft);
    }
    // 복사 성공 시 백엔드에 발송 시각 기록 (팀장 대시보드에서 SMS 누락 추적)
    if (copied && id && isPersistableId) {
      try {
        await api.updateBankConsultation(id, {
          last_sms_sent_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[updateBankConsultation:last_sms_sent_at]", e);
      }
    }
  };

  const regenerateDraft = () => {
    setSmsDraft(buildSmsText());
    setCopyState("idle");
  };

  const proceedToSigning = async () => {
    if (!data.signingDate || !data.signingTime) {
      toast.warning("자서일과 시간을 먼저 입력해 주세요.");
      return;
    }
    const label =
      data.location.kind === "bank"
        ? data.bankBranchLabel
        : data.location.customLabel ?? "";
    if (!label.trim()) {
      toast.warning("자서장소를 입력해 주세요.");
      return;
    }
    if (data.location.kind === "custom") {
      pushRecentLocation(label);
      setRecents(getRecentLocations());
    }
    if (conflicts.length > 0) {
      const ok = window.confirm(
        `같은 일정·장소에 이미 ${conflicts.length}건의 자서예약이 있습니다. 그래도 확정할까요?`,
      );
      if (!ok) return;
    }
    saveReservationHandoff({
      caseId: id ?? data.id,
      signingDate: data.signingDate,
      signingTime: data.signingTime,
      signingLocation: label,
      spouseAccompany: data.spouseAccompany,
      companionNote: data.companionNote,
      remark: data.remark,
    });
    if (id) {
      if (isPersistableId) {
        try { await api.updateBankConsultation(id, reservationToBackend(data)); }
        catch (e) { console.warn("[updateBankConsultation]", e); }
      }
      try { await api.updateBankStatus(id, "signing"); } catch (e) { console.warn("[updateBankStatus]", e); }
    }
    toast.success("자서예약 확정", {
      description: `${data.customerName || data.id} 고객 — ${formatKoreanDate(data.signingDate)} ${data.signingTime}`,
    });
    clearDraft();
    if (embed) {
      onEmbedComplete?.();
    } else {
      navigate(`/v4/wizard/signing/${id}`);
    }
  };

  useEffect(() => {
    if (embed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewOpen) {
          setPreviewOpen(false);
          return;
        }
        navigate("/v4");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (previewOpen) {
          copyDraftToClipboard();
          return;
        }
        proceedToSigning();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, previewOpen, smsDraft, embed]);

  const savedLabel = savedAt
    ? `임시 저장됨 · ${savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
    : "입력 시 임시 저장됩니다";

  const todayIso = ymd(new Date());

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
            onClick={openSmsPreview}
            title="자서일·시간·장소·구비서류 안내문을 미리보고 수정 후 복사 (고객 문자 발송용)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 12px",
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
            <Copy size={13} strokeWidth={1.8} />
            문자 안내문
          </button>
          <button
            type="button"
            onClick={proceedToSigning}
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
            자서로 진행
            {embed ? null : <Kbd>⌘↵</Kbd>}
          </button>
          {embed ? null : <UserMenu />}
        </div>
      </header>

      {embed ? null : <PipelineStrip current={1} caseId={id ?? ""} />}

      <main
        style={{
          flex: 1,
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
          padding: "12px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Title strip */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            padding: "2px 4px",
          }}
        >
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
              {data.complex || "—"}
            </h1>
            <span style={{ fontSize: 12.5, color: "var(--v4-text-tertiary)", fontWeight: 500 }}>
              {data.customerName ? `${data.customerName} · 자서예약` : "자서예약"}
            </span>
          </div>
          {data.dDay ? (
            <span
              style={{
                fontSize: 10.5,
                color: "var(--v4-warning)",
                background: "var(--v4-bg-warning)",
                padding: "2px 8px",
                borderRadius: "var(--v4-radius-sm)",
                fontWeight: 500,
              }}
            >
              {data.dDay}
            </span>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, minHeight: 0 }}>
          {/* LEFT: Calendar + bookings list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <section style={SECTION_STYLE}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={SECTION_TITLE_STYLE}>📅 자서일 선택</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const m = viewMonth - 1;
                      if (m < 0) {
                        setViewYear((y) => y - 1);
                        setViewMonth(11);
                      } else setViewMonth(m);
                    }}
                    style={navBtnStyle}
                    aria-label="이전 달"
                  >
                    <ChevronLeft size={14} strokeWidth={1.8} />
                  </button>
                  <span
                    style={{
                      minWidth: 90,
                      textAlign: "center",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--v4-text-primary)",
                    }}
                  >
                    {viewYear}.{pad(viewMonth + 1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const m = viewMonth + 1;
                      if (m > 11) {
                        setViewYear((y) => y + 1);
                        setViewMonth(0);
                      } else setViewMonth(m);
                    }}
                    style={navBtnStyle}
                    aria-label="다음 달"
                  >
                    <ChevronRight size={14} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date();
                      setViewYear(t.getFullYear());
                      setViewMonth(t.getMonth());
                    }}
                    style={{
                      ...navBtnStyle,
                      width: "auto",
                      padding: "0 8px",
                      fontSize: 11.5,
                    }}
                  >
                    오늘
                  </button>
                  {/* B2C 제외 편집 모드 토글 */}
                  <button
                    type="button"
                    onClick={() => setB2cExcludeMode(v => !v)}
                    title="B2C 입주민 앱에서 안 되는 날 클릭으로 제외 (기본: 자서일 선택 모드)"
                    style={{
                      ...navBtnStyle,
                      width: "auto",
                      padding: "0 8px",
                      fontSize: 11,
                      background: b2cExcludeMode ? "#fee2e2" : undefined,
                      color: b2cExcludeMode ? "#dc2626" : undefined,
                      borderColor: b2cExcludeMode ? "#fca5a5" : undefined,
                      fontWeight: b2cExcludeMode ? 700 : undefined,
                    }}
                  >
                    {b2cExcludeMode ? "🚫 제외 편집중" : "B2C 제외 편집"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  rowGap: 2,
                  columnGap: 2,
                }}
              >
                {WEEKDAY_LABELS.map((w, i) => (
                  <div
                    key={w}
                    style={{
                      textAlign: "center",
                      fontSize: 10.5,
                      fontWeight: 600,
                      color:
                        i === 0
                          ? "var(--v4-danger)"
                          : i === 6
                          ? "var(--v4-text-info)"
                          : "var(--v4-text-tertiary)",
                      padding: "4px 0",
                    }}
                  >
                    {w}
                  </div>
                ))}
                {monthMatrix.map((d) => {
                  const inMonth = d.getMonth() === viewMonth;
                  const iso = ymd(d);
                  const bookings = bookingsByDate.get(iso) ?? [];
                  const selected = data.signingDate === iso;
                  const isToday = iso === todayIso;
                  const isExcluded = b2cExcludedDates.has(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        if (b2cExcludeMode) {
                          toggleB2cExcluded(iso);
                        } else {
                          patch("signingDate", iso);
                        }
                      }}
                      title={b2cExcludeMode ? (isExcluded ? "제외됨 — 클릭하면 가능으로" : "클릭하면 B2C 제외") : undefined}
                      style={{
                        position: "relative",
                        height: 44,
                        background: isExcluded
                          ? "#fef2f2"
                          : selected
                          ? "var(--v4-bg-info)"
                          : isToday
                          ? "var(--v4-bg-secondary)"
                          : "var(--v4-bg-primary)",
                        border: isExcluded
                          ? "2px solid #dc2626"
                          : selected
                          ? "1.5px solid var(--v4-text-info)"
                          : "1px solid var(--v4-border-tertiary)",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        padding: "4px 6px",
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: selected || isToday ? 700 : 500,
                          color: isExcluded
                            ? "#dc2626"
                            : d.getDay() === 0
                            ? "var(--v4-danger)"
                            : d.getDay() === 6
                            ? "var(--v4-text-info)"
                            : "var(--v4-text-primary)",
                          textDecoration: isExcluded ? "line-through" : undefined,
                        }}
                      >
                        {d.getDate()}
                      </div>
                      {bookings.length > 0 ? (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 4,
                            left: 6,
                            right: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--v4-warning)",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            className="v4-tabular"
                            style={{
                              fontSize: 10,
                              color: "var(--v4-warning)",
                              fontWeight: 600,
                            }}
                          >
                            {bookings.length}건
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 11,
                  color: "var(--v4-text-tertiary)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--v4-warning)",
                    }}
                  />
                  자서예약 있음
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: "var(--v4-bg-info)",
                      border: "1.5px solid var(--v4-text-info)",
                    }}
                  />
                  선택
                </span>
              </div>
            </section>

            {/* Bookings of selected date */}
            <section style={SECTION_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
                {data.signingDate
                  ? `${formatKoreanDate(data.signingDate)} 기존 자서예약 ${selectedBookings.length}건`
                  : "날짜를 선택하면 기존 예약 명단이 표시됩니다"}
              </div>
              {selectedBookings.length === 0 ? (
                <div
                  style={{
                    padding: "16px 4px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--v4-text-tertiary)",
                  }}
                >
                  {data.signingDate ? "예약 없음 — 일정 가능" : "—"}
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {selectedBookings.map((b) => {
                    const isMe = b.id === data.id;
                    return (
                      <li
                        key={b.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "60px 1fr",
                          columnGap: 10,
                          alignItems: "start",
                          padding: "8px 10px",
                          background: isMe ? "var(--v4-bg-info)" : "var(--v4-bg-secondary)",
                          border: `1px solid ${isMe ? "var(--v4-text-info)" : "var(--v4-border-tertiary)"}`,
                          borderRadius: 6,
                        }}
                      >
                        <span
                          className="v4-tabular"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--v4-text-primary)",
                          }}
                        >
                          {b.signingTime}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--v4-text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {b.customerName} · {b.dongHo}
                            {isMe ? (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  color: "var(--v4-text-info)",
                                  background: "var(--v4-bg-primary)",
                                  padding: "1px 6px",
                                  borderRadius: 3,
                                  fontWeight: 600,
                                }}
                              >
                                내 예약
                              </span>
                            ) : null}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "var(--v4-text-tertiary)",
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {b.signingLocation} · {b.bankContact}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT: Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            {/* Schedule */}
            <section style={SECTION_STYLE}>
              <div style={SECTION_TITLE_STYLE}>✍ 자서 일정</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={LABEL_STYLE}>자서일</label>
                  <input
                    type="date"
                    value={data.signingDate}
                    onChange={(e) => patch("signingDate", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>시간</label>
                  <input
                    type="time"
                    value={data.signingTime}
                    onChange={(e) => patch("signingTime", e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              <label style={LABEL_STYLE}>자서장소</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12.5,
                    color: "var(--v4-text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="loc"
                    checked={data.location.kind === "bank"}
                    onChange={() => patch("location", { kind: "bank" })}
                  />
                  <span>해당 은행</span>
                  <input
                    type="text"
                    value={data.bankBranchLabel}
                    onChange={(e) => patch("bankBranchLabel", e.target.value)}
                    placeholder="예: 국민은행 부전동지점 2층 상담실"
                    disabled={data.location.kind !== "bank"}
                    style={{
                      ...INPUT_STYLE,
                      flex: 1,
                      opacity: data.location.kind === "bank" ? 1 : 0.5,
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12.5,
                    color: "var(--v4-text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="loc"
                    checked={data.location.kind === "custom"}
                    onChange={() =>
                      patch("location", {
                        kind: "custom",
                        customLabel: data.location.customLabel ?? "",
                      })
                    }
                  />
                  <span>직접 입력</span>
                  <input
                    type="text"
                    value={data.location.customLabel ?? ""}
                    onChange={(e) =>
                      patch("location", { kind: "custom", customLabel: e.target.value })
                    }
                    placeholder="예: 고객 자택, 회사, 카페 등"
                    disabled={data.location.kind !== "custom"}
                    style={{
                      ...INPUT_STYLE,
                      flex: 1,
                      opacity: data.location.kind === "custom" ? 1 : 0.5,
                    }}
                  />
                </label>

                {recents.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 4,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)", marginRight: 4 }}>
                      최근:
                    </span>
                    {recents.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => patch("location", { kind: "custom", customLabel: r })}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--v4-bg-secondary)",
                          border: "1px solid var(--v4-border-tertiary)",
                          color: "var(--v4-text-secondary)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {conflicts.length > 0 ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    padding: "8px 10px",
                    background: "var(--v4-bg-warning)",
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: "var(--v4-warning)",
                  }}
                >
                  <AlertTriangle size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    같은 일정·장소에 이미 {conflicts.length}건 예약됨 ·{" "}
                    {conflicts.map((c) => `${c.signingTime} ${c.customerName}`).join(", ")}
                  </div>
                </div>
              ) : null}
            </section>

            {/* Companions */}
            <section style={SECTION_STYLE}>
              <div style={SECTION_TITLE_STYLE}>👥 동석자</div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  fontSize: 12.5,
                  color: "var(--v4-text-primary)",
                  background: data.spouseAccompany
                    ? "var(--v4-bg-info)"
                    : "var(--v4-bg-secondary)",
                  border: `1px solid ${
                    data.spouseAccompany
                      ? "var(--v4-text-info)"
                      : "var(--v4-border-tertiary)"
                  }`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={data.spouseAccompany}
                  onChange={(e) => patch("spouseAccompany", e.target.checked)}
                  style={{ margin: 0 }}
                />
                배우자 동석
              </label>
              <textarea
                value={data.companionNote}
                onChange={(e) => patch("companionNote", e.target.value)}
                placeholder="비고 (예: 배우자 14:00 별도 도착, 공동명의 등)"
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  height: "auto",
                  padding: "8px 10px",
                  marginTop: 8,
                  resize: "vertical" as const,
                  fontFamily: "inherit",
                }}
              />
            </section>

            {/* Documents — 컴팩트 요약 + 보기 버튼 (전체 LIST는 모달) */}
            <section style={SECTION_STYLE}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ ...SECTION_TITLE_STYLE, marginBottom: 0 }}>📋 당사자 준비서류</div>
                <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                  총 {data.documents.length}항목
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDocsModalOpen(true)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "var(--v4-bg-secondary)",
                  border: "1px solid var(--v4-border-secondary)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--v4-text-primary)" }}>
                    📋 준비서류 LIST 자세히 보기
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                    공통 14 · 재직자 3 · 사업자 3 · 기타 3 · 배우자 6
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: "var(--v4-text-tertiary)" }} />
              </button>

              <textarea
                value={data.remark}
                onChange={(e) => patch("remark", e.target.value)}
                placeholder="비고 (예: 인감 지참 재안내 완료, 14:00 도착 예정 등)"
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  height: "auto",
                  padding: "8px 10px",
                  marginTop: 10,
                  resize: "vertical" as const,
                  fontFamily: "inherit",
                }}
              />
            </section>

            {/* B2C 자서 캘린더 — 위 자서일 선택 캘린더에서 [B2C 제외 편집] 모드로 날짜 토글 */}
            {id && (
              <SigningSlotInline
                consultationId={id}
                excludedDates={b2cExcludedDates}
                setExcludedDates={setB2cExcludedDates}
                excludeMode={b2cExcludeMode}
              />
            )}
          </div>
        </div>
      </main>

      {/* 준비서류 LIST 우측 슬라이드 패널 */}
      {docsModalOpen
        ? createPortal(
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setDocsModalOpen(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                zIndex: 50,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  width: "min(560px, 100vw)",
                  height: "100vh",
                  background: "var(--v4-bg-primary)",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "-8px 0 24px rgba(0,0,0,0.15)",
                  animation: "slideInRight 0.2s ease-out",
                }}
              >
                <div style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--v4-border-tertiary)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>📋 당사자 준비서류 LIST</h2>
                    <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                      자서 당일 지참 · 차주·담보제공자 각 1세트
                    </p>
                  </div>
                  <button
                    onClick={() => setDocsModalOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                    title="닫기 (ESC)"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                  <DocumentsTable
                    docs={data.documents}
                    onChange={(docs) => patch("documents", docs)}
                  />

                  <div style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background: "var(--v4-bg-secondary)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--v4-text-secondary)",
                    lineHeight: 1.6,
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--v4-text-primary)" }}>⚠️ 주의사항</p>
                    <p style={{ margin: "4px 0 0 0" }}>1. 모든 서류 상 주민등록 뒷 번호 필수 공개</p>
                    <p style={{ margin: 0 }}>2. 발급 매수 확인</p>
                    <p style={{ margin: 0 }}>3. 초본 — 원초본 / 신분증이 없는 미성년 자녀가 계실 경우, 기본증명서(상세)로 발급</p>
                  </div>
                </div>

                <div style={{
                  padding: 12,
                  borderTop: "1px solid var(--v4-border-tertiary)",
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                }}>
                  <button
                    onClick={printDocs}
                    style={{
                      background: "white",
                      border: "1px solid var(--v4-border-secondary)",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🖨 인쇄
                  </button>
                  <button
                    onClick={() => setDocsModalOpen(false)}
                    style={{
                      background: "var(--v4-text-primary)",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    닫기
                  </button>
                </div>
                <style>{`
                  @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                  }
                `}</style>
              </div>
            </div>,
            document.body,
          )
        : null}

      {previewOpen
        ? createPortal(
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setPreviewOpen(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                zIndex: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <div
                role="dialog"
                aria-label="문자 안내문 미리보기"
                aria-modal="true"
                style={{
                  width: "100%",
                  maxWidth: 560,
                  maxHeight: "min(90vh, 720px)",
                  background: "var(--v4-bg-primary)",
                  borderRadius: 12,
                  boxShadow: "0 18px 60px rgba(15, 23, 42, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--v4-border-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: "var(--v4-text-primary)",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      문자 안내문 미리보기
                    </h2>
                    <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}>
                      수정 후 복사 가능
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="닫기"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "var(--v4-text-tertiary)",
                      fontFamily: "inherit",
                    }}
                  >
                    <X size={15} strokeWidth={1.8} />
                  </button>
                </div>

                {/* Body — editable textarea */}
                <div
                  style={{
                    padding: "12px 16px",
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <textarea
                    value={smsDraft}
                    onChange={(e) => setSmsDraft(e.target.value)}
                    spellCheck={false}
                    style={{
                      flex: 1,
                      minHeight: 320,
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--v4-text-primary)",
                      background: "var(--v4-bg-secondary)",
                      border: "1px solid var(--v4-border-tertiary)",
                      borderRadius: 8,
                      resize: "vertical",
                      fontFamily:
                        '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
                      whiteSpace: "pre",
                      overflow: "auto",
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      color: "var(--v4-text-tertiary)",
                    }}
                  >
                    <span>
                      이 메시지는 클립보드에만 복사됩니다. 자동 발송되지 않습니다.
                    </span>
                    <span className="v4-tabular">{smsDraft.length}자</span>
                  </div>
                </div>

                {/* Footer actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderTop: "1px solid var(--v4-border-tertiary)",
                    background: "var(--v4-bg-secondary)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={regenerateDraft}
                    title="현재 입력값으로 다시 생성"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      height: 28,
                      padding: "0 10px",
                      fontSize: 12,
                      color: "var(--v4-text-secondary)",
                      background: "transparent",
                      border: "1px solid var(--v4-border-secondary)",
                      borderRadius: "var(--v4-radius-md)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <RotateCcw size={12} strokeWidth={1.8} />
                    초기화
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    {data.phone ? (
                      <a
                        href={`sms:${data.phone.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(smsDraft)}`}
                        title="기본 SMS 앱으로 열기 (모바일 권장)"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          height: 28,
                          padding: "0 10px",
                          fontSize: 12,
                          color: "var(--v4-text-secondary)",
                          background: "transparent",
                          border: "1px solid var(--v4-border-secondary)",
                          borderRadius: "var(--v4-radius-md)",
                          textDecoration: "none",
                          fontFamily: "inherit",
                        }}
                      >
                        <MessageSquare size={12} strokeWidth={1.8} />
                        SMS 앱 열기
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(false)}
                      style={{
                        height: 28,
                        padding: "0 12px",
                        fontSize: 12.5,
                        color: "var(--v4-text-secondary)",
                        background: "transparent",
                        border: "1px solid var(--v4-border-secondary)",
                        borderRadius: "var(--v4-radius-md)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      닫기
                    </button>
                    <button
                      type="button"
                      onClick={copyDraftToClipboard}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 28,
                        padding: "0 14px",
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: "#fff",
                        background:
                          copyState === "copied"
                            ? "var(--v4-success)"
                            : "var(--v4-text-info)",
                        border: "none",
                        borderRadius: "var(--v4-radius-md)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 120ms ease",
                      }}
                    >
                      {copyState === "copied" ? (
                        <>
                          <Check size={13} strokeWidth={2} />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy size={13} strokeWidth={1.8} />
                          복사
                          <Kbd>⌘↵</Kbd>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const navBtnStyle = {
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--v4-bg-primary)",
  border: "1px solid var(--v4-border-tertiary)",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--v4-text-secondary)",
  fontFamily: "inherit" as const,
};
