import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { TaskItem } from "../home/TaskRow";

type Props = {
  name: string;
  tasks: TaskItem[];
  otherMembers: string[];
  onClose: () => void;
  onConfirm: (reassignTo: string | null) => void;
};

const KEEP_ASSIGNMENTS = "__keep__";

export function DeactivateConsultantModal({
  name,
  tasks,
  otherMembers,
  onClose,
  onConfirm,
}: Props) {
  const hasTasks = tasks.length > 0;
  const [target, setTarget] = useState<string>(() =>
    hasTasks && otherMembers[0] ? otherMembers[0] : KEEP_ASSIGNMENTS,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, 100%)",
          background: "var(--v4-bg-primary)",
          border: "1px solid var(--v4-border-secondary)",
          borderRadius: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--v4-border-light)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                width: 22,
                height: 22,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 5,
                background: "var(--v4-bg-warning)",
                color: "var(--v4-text-warning)",
              }}
            >
              <AlertTriangle size={13} strokeWidth={2} />
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--v4-text-primary)",
              }}
            >
              상담사 비활성화
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "none",
              background: "transparent",
              color: "var(--v4-text-tertiary)",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        <div style={{ padding: "14px 16px", overflowY: "auto" }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--v4-text-secondary)", lineHeight: 1.5 }}>
            <b style={{ color: "var(--v4-text-primary)" }}>{name}</b> 상담사를 비활성화합니다.
            현재 담당 중인 고객은 <b className="v4-tabular">{tasks.length}</b>건이며, 비활성화 이후
            신규 배정 대상에서 제외됩니다.
          </p>

          {hasTasks ? (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--v4-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                기존 고객 {tasks.length}건 처리
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {otherMembers.length === 0 ? (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--v4-text-tertiary)",
                      padding: "10px 0",
                    }}
                  >
                    재배정 가능한 다른 상담사가 없습니다. 비활성화 후 팀장이 직접 배정해 주세요.
                  </div>
                ) : (
                  otherMembers.map((m) => (
                    <label
                      key={m}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        border: `1px solid ${target === m ? "var(--v4-info)" : "var(--v4-border-light)"}`,
                        background: target === m ? "var(--v4-bg-info)" : "var(--v4-bg-primary)",
                        borderRadius: 5,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="reassign-target"
                        value={m}
                        checked={target === m}
                        onChange={() => setTarget(m)}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontWeight: 500, color: "var(--v4-text-primary)" }}>{m}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--v4-text-tertiary)",
                          marginLeft: "auto",
                        }}
                      >
                        에게 일괄 이관
                      </span>
                    </label>
                  ))
                )}

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    border: `1px dashed ${target === KEEP_ASSIGNMENTS ? "var(--v4-text-warning)" : "var(--v4-border-light)"}`,
                    background:
                      target === KEEP_ASSIGNMENTS
                        ? "var(--v4-bg-warning)"
                        : "var(--v4-bg-primary)",
                    borderRadius: 5,
                    fontSize: 12.5,
                    cursor: "pointer",
                    marginTop: 2,
                  }}
                >
                  <input
                    type="radio"
                    name="reassign-target"
                    value={KEEP_ASSIGNMENTS}
                    checked={target === KEEP_ASSIGNMENTS}
                    onChange={() => setTarget(KEEP_ASSIGNMENTS)}
                    style={{ margin: 0 }}
                  />
                  <span
                    style={{
                      fontWeight: 500,
                      color:
                        target === KEEP_ASSIGNMENTS
                          ? "var(--v4-text-warning)"
                          : "var(--v4-text-primary)",
                    }}
                  >
                    재배정 보류
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--v4-text-tertiary)",
                      marginLeft: "auto",
                    }}
                  >
                    팀장이 나중에 직접 지정
                  </span>
                </label>
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 14,
              padding: "9px 11px",
              background: "var(--v4-bg-secondary)",
              border: "1px solid var(--v4-border-light)",
              borderRadius: 5,
              fontSize: 11,
              color: "var(--v4-text-tertiary)",
              lineHeight: 1.55,
            }}
          >
            ※ 임시 조치. 백엔드에 <code>accounts.is_active</code> 컬럼이 추가되면 영구 반영됩니다.
            계정 자체는 삭제되지 않으며, 대리 접속 및 기존 기록 조회는 계속 가능합니다.
          </div>
        </div>

        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "10px 14px",
            borderTop: "1px solid var(--v4-border-light)",
            background: "var(--v4-bg-secondary)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--v4-text-secondary)",
              background: "transparent",
              border: "1px solid var(--v4-border-light)",
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target === KEEP_ASSIGNMENTS ? null : target)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "var(--v4-text-warning)",
              border: "1px solid var(--v4-text-warning)",
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {hasTasks && target !== KEEP_ASSIGNMENTS
              ? `비활성화 + ${tasks.length}건 이관`
              : "비활성화"}
          </button>
        </footer>
      </div>
    </div>
  );
}
