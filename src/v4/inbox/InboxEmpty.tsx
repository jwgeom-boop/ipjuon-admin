import { Inbox } from "lucide-react";

export function InboxEmpty() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "var(--v4-text-tertiary)",
        background: "var(--v4-bg-secondary)",
      }}
    >
      <Inbox size={36} strokeWidth={1.4} />
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--v4-text-secondary)" }}>
        왼쪽에서 항목을 선택하세요
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 11,
          color: "var(--v4-text-tertiary)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span>
          <kbd className="v4-kbd">j</kbd>
          <kbd className="v4-kbd" style={{ marginLeft: 2 }}>k</kbd> 이동
        </span>
        <span>
          <kbd className="v4-kbd">↵</kbd> 위저드
        </span>
        <span>
          <kbd className="v4-kbd">e</kbd> 완료
        </span>
        <span>
          <kbd className="v4-kbd">/</kbd> 검색
        </span>
        <span>
          <kbd className="v4-kbd">⌘</kbd>
          <kbd className="v4-kbd" style={{ marginLeft: 2 }}>K</kbd> 팔레트
        </span>
      </div>
    </div>
  );
}
