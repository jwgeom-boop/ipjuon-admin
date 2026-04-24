import { useEffect, useState } from "react";

function format(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return n.toLocaleString("ko-KR");
}

function parse(v: string): number | null {
  const cleaned = v.replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function MoneyInput({
  value,
  onChange,
  placeholder,
  suffix = "원",
  readOnly,
}: {
  value: number | null;
  onChange?: (n: number | null) => void;
  placeholder?: string;
  suffix?: string;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(format(value));

  useEffect(() => {
    setText(format(value));
  }, [value]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 6,
        flex: 1,
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (!readOnly) onChange?.(parse(raw));
        }}
        onBlur={() => {
          setText(format(parse(text)));
        }}
        placeholder={placeholder ?? "0"}
        readOnly={readOnly}
        className="v4-tabular"
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 14,
          color: "var(--v4-text-primary)",
          padding: "2px 0",
          borderBottom: "1px solid transparent",
          fontFamily: "inherit",
          textAlign: "right",
          fontWeight: readOnly ? 500 : 400,
        }}
        onFocus={(e) => {
          e.target.style.borderBottomColor = "var(--v4-info)";
        }}
        onBlurCapture={(e) => {
          e.target.style.borderBottomColor = "transparent";
        }}
      />
      <span style={{ fontSize: 12, color: "var(--v4-text-tertiary)" }}>{suffix}</span>
    </div>
  );
}
