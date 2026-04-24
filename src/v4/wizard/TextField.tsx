export function TextField({
  value,
  onChange,
  placeholder,
  readOnly,
  align = "left",
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  align?: "left" | "right";
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
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
        textAlign: align,
      }}
      onFocus={(e) => {
        if (!readOnly) e.target.style.borderBottomColor = "var(--v4-info)";
      }}
      onBlur={(e) => {
        e.target.style.borderBottomColor = "transparent";
      }}
    />
  );
}
