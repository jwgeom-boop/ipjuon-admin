import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalSize = "L" | "M" | "embed";

const SIZE_STYLES: Record<ModalSize, { maxWidth: number; height: string }> = {
  L: { maxWidth: 1600, height: "min(94vh, 920px)" },
  M: { maxWidth: 1280, height: "min(90vh, 820px)" },
  embed: { maxWidth: 1400, height: "min(92vh, 900px)" },
};

type Props = {
  size: ModalSize;
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
  // 백드롭/쉘을 구분할 수 있는 class 훅. print-media 규칙 등 외부에서 타겟팅할 때 사용.
  className?: string;
  shellClassName?: string;
  // 백드롭 직접 적용 스타일(오버레이 뒤에 다른 모달이 있어야 하는 예외 상황용)
  backdropStyle?: CSSProperties;
};

export function ModalShell({
  size,
  ariaLabel,
  onClose,
  children,
  className,
  shellClassName,
  backdropStyle,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preset = SIZE_STYLES[size];

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        ...backdropStyle,
      }}
    >
      <div
        role="dialog"
        aria-label={ariaLabel}
        aria-modal="true"
        className={shellClassName}
        style={{
          width: "100%",
          maxWidth: preset.maxWidth,
          height: preset.height,
          background: "var(--v4-bg-primary)",
          borderRadius: 12,
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

type ModalHeaderProps = {
  title: ReactNode;
  // 제목 오른쪽 작은 메타 정보(예: "총 12건", "3/10건")
  badge?: ReactNode;
  // 제목 행에 추가로 들어가는 요소(탭/필터 칩 등). 왼쪽에 nowrap으로 나열.
  titleExtras?: ReactNode;
  // 우측 액션 버튼 슬롯. 닫기 버튼은 자동으로 맨 오른쪽에 추가됨.
  actions?: ReactNode;
  onClose: () => void;
  // print-media 등에서 숨기기 위한 외부 class 훅
  className?: string;
};

export function ModalHeader({
  title,
  badge,
  titleExtras,
  actions,
  onClose,
  className,
}: ModalHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 18px",
        borderBottom: "1px solid var(--v4-border-tertiary)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--v4-text-primary)",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </h2>
        {badge != null ? (
          <span
            className="v4-tabular"
            style={{ fontSize: 12.5, color: "var(--v4-text-tertiary)" }}
          >
            {badge}
          </span>
        ) : null}
        {titleExtras}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {actions}
        <ModalCloseButton onClose={onClose} />
      </div>
    </div>
  );
}

export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="닫기"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        background: "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        color: "var(--v4-text-tertiary)",
        fontFamily: "inherit",
      }}
    >
      <X size={16} strokeWidth={1.8} />
    </button>
  );
}

// 헤더 내부에서 사용하는 공통 액션 버튼 스타일(엑셀/인쇄/위저드 열기 등).
// primary=true는 강조 색(엑셀 다운로드 같은 주요 액션)에 쓰되, 기본은 아웃라인.
export const modalActionButtonStyle = (
  opts: { primary?: boolean; disabled?: boolean } = {},
): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  fontSize: 12.5,
  fontWeight: 500,
  color: opts.primary
    ? "#fff"
    : opts.disabled
      ? "var(--v4-text-tertiary)"
      : "var(--v4-text-secondary)",
  background: opts.primary ? "var(--v4-success)" : "var(--v4-bg-primary)",
  border: opts.primary ? "none" : "1px solid var(--v4-border-secondary)",
  borderRadius: "var(--v4-radius-md)",
  cursor: opts.disabled ? "not-allowed" : "pointer",
  opacity: opts.disabled ? 0.6 : 1,
  fontFamily: "inherit",
});
