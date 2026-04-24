import { MoneyInput } from "./MoneyInput";
import { TextField } from "./TextField";

export function OtherItemBlock({
  label,
  hint,
  amount,
  bank,
  account,
  onAmount,
  onBank,
  onAccount,
}: {
  label: string;
  hint?: string;
  amount: number;
  bank: string;
  account: string;
  onAmount: (n: number) => void;
  onBank: (v: string) => void;
  onAccount: (v: string) => void;
}) {
  const isEmpty = !amount;

  return (
    <div
      style={{
        padding: "16px 18px",
        borderBottom: "1px solid var(--v4-border-tertiary)",
        background: isEmpty ? "transparent" : "var(--v4-bg-secondary)",
        borderRadius: "var(--v4-radius-md)",
        marginBottom: 8,
        transition: "background 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13.5, color: "var(--v4-text-primary)", fontWeight: 500 }}>
            {label}
          </span>
          {hint ? (
            <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>{hint}</span>
          ) : null}
        </div>
        <div style={{ minWidth: 180, display: "flex", justifyContent: "flex-end" }}>
          <MoneyInput value={amount} onChange={(v) => onAmount(v ?? 0)} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 14,
          paddingLeft: 14,
          borderLeft: "2px solid var(--v4-border-tertiary)",
          opacity: isEmpty ? 0.5 : 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)", fontWeight: 500 }}>
            은행
          </span>
          <TextField value={bank} onChange={onBank} placeholder="은행명" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--v4-text-tertiary)", fontWeight: 500 }}>
            계좌
          </span>
          <TextField value={account} onChange={onAccount} placeholder="계좌번호" />
        </div>
      </div>
    </div>
  );
}
