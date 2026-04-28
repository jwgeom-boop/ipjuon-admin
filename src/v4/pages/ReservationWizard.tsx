import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, AlertTriangle, Copy, Check, RotateCcw, X, MessageSquare, CalendarClock } from "lucide-react";
import SigningSlotDialog from "../inbox/SigningSlotDialog";
import { toast } from "sonner";
import { Kbd } from "../components/Kbd";
import {
  getReservationFixture,
  getRecentLocations,
  pushRecentLocation,
  type ReservationData,
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
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
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
          {/* B2C 자서 일정 슬롯 관리 */}
          {id && (
            <button
              type="button"
              onClick={() => setSlotDialogOpen(true)}
              title="입주민 앱으로 가능한 자서 일정 N개를 제시 → 입주민 선택 → 확정 (B2C 워크플로)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 12px",
                fontSize: 12.5,
                color: "#fff",
                background: "#1d4ed8",
                border: "none",
                borderRadius: "var(--v4-radius-md)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              <CalendarClock size={13} strokeWidth={1.8} />
              자서 일정 (B2C)
            </button>
          )}
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
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => patch("signingDate", iso)}
                      style={{
                        position: "relative",
                        height: 44,
                        background: selected
                          ? "var(--v4-bg-info)"
                          : isToday
                          ? "var(--v4-bg-secondary)"
                          : "var(--v4-bg-primary)",
                        border: selected
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
                          color:
                            d.getDay() === 0
                              ? "var(--v4-danger)"
                              : d.getDay() === 6
                              ? "var(--v4-text-info)"
                              : "var(--v4-text-primary)",
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

            {/* Documents — 안내 (체크 없음) */}
            <section style={SECTION_STYLE}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ ...SECTION_TITLE_STYLE, marginBottom: 0 }}>📋 필요서류 안내</div>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--v4-text-tertiary)",
                  }}
                >
                  자서 당일 지참 안내용
                </span>
              </div>
              <ol
                style={{
                  margin: 0,
                  padding: "0 0 0 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  color: "var(--v4-text-primary)",
                }}
              >
                {data.documents.map((doc) => (
                  <li
                    key={doc.id}
                    style={{ fontSize: 12.5, lineHeight: 1.45 }}
                  >
                    <span style={{ fontWeight: 500 }}>{doc.name}</span>
                    {doc.note ? (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11.5,
                          color: "var(--v4-text-tertiary)",
                        }}
                      >
                        — {doc.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
              <textarea
                value={data.remark}
                onChange={(e) => patch("remark", e.target.value)}
                placeholder="비고 (예: 인감 지참 재안내 완료, 14:00 도착 예정 등)"
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  height: "auto",
                  padding: "8px 10px",
                  marginTop: 12,
                  resize: "vertical" as const,
                  fontFamily: "inherit",
                }}
              />
            </section>
          </div>
        </div>
      </main>

      {/* B2C 자서 일정 슬롯 다이얼로그 */}
      {id && (
        <SigningSlotDialog
          consultationId={id}
          open={slotDialogOpen}
          onClose={() => setSlotDialogOpen(false)}
        />
      )}

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
