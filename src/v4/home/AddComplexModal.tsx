import { useEffect, useRef, useState } from "react";
import { Building2, X } from "lucide-react";

export function AddComplexModal({
  existing,
  onClose,
  onSubmit,
}: {
  existing: string[];
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("아파트명을 입력해주세요");
      return;
    }
    if (existing.some((c) => c === trimmed)) {
      setError("이미 등록된 아파트입니다");
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(420px, 100%)",
          background: "var(--v4-bg-primary)",
          borderRadius: "var(--v4-radius-lg)",
          border: "1px solid var(--v4-border-secondary)",
          boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--v4-border-tertiary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "var(--v4-bg-info)",
                color: "var(--v4-info)",
              }}
            >
              <Building2 size={15} strokeWidth={2} />
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--v4-text-primary)" }}>
                새 아파트 추가
              </div>
              <div style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                상담을 진행할 아파트를 등록합니다
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--v4-border-tertiary)",
              borderRadius: 6,
              background: "var(--v4-bg-primary)",
              cursor: "pointer",
              color: "var(--v4-text-secondary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--v4-text-tertiary)" }}>
              아파트명 <span style={{ color: "var(--v4-danger)" }}>*</span>
            </span>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="예) 봄여름가을겨울3차"
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: "inherit",
                color: "var(--v4-text-primary)",
                background: "var(--v4-bg-primary)",
                border: `1px solid ${error ? "var(--v4-danger)" : "var(--v4-border-secondary)"}`,
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            />
          </label>
          {error ? (
            <span style={{ fontSize: 11, color: "var(--v4-danger)" }}>{error}</span>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 18px",
            borderTop: "1px solid var(--v4-border-tertiary)",
            background: "var(--v4-bg-secondary)",
            borderBottomLeftRadius: "var(--v4-radius-lg)",
            borderBottomRightRadius: "var(--v4-radius-lg)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--v4-text-secondary)",
              background: "var(--v4-bg-primary)",
              border: "1px solid var(--v4-border-tertiary)",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "var(--v4-info)",
              border: "1px solid transparent",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            추가
          </button>
        </div>
      </form>
    </div>
  );
}
