import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Building2, ChevronDown } from "lucide-react";
import { ReactNode } from "react";

export type ComplexProp =
  | string
  | { value: string; options: string[]; onChange: (v: string) => void };

function ProgressDonut({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const circ = 2 * Math.PI * 15; // ~94.2
  const dash = pct * circ;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#f0efeb" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--v4-success)"
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--v4-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontWeight: 500,
          }}
        >
          오늘 진행률
        </span>
        <span
          className="v4-tabular"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--v4-text-primary)" }}
        >
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

export function HeroStrip({
  bankName,
  complex,
  progress,
  actions,
}: {
  bankName: string;
  complex?: ComplexProp;
  progress?: { done: number; total: number };
  actions?: ReactNode;
}) {
  const isSelector =
    !!complex && typeof complex === "object" && Array.isArray(complex.options);
  const complexValue = isSelector
    ? (complex as Exclude<ComplexProp, string>).value
    : (complex as string | undefined);
  const today = new Date();
  const dateLabel = format(today, "M월 d일 EEEE", { locale: ko });

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        flexWrap: "wrap",
        padding: "14px 4px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.3px",
            color: "var(--v4-text-primary)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          안녕하세요, <span style={{ color: "var(--v4-info)" }}>{bankName}</span>
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--v4-text-tertiary)",
            flexWrap: "wrap",
          }}
        >
          <span className="v4-tabular">{dateLabel}</span>
          {complexValue !== undefined && complexValue !== "" ? (
            <>
              <span style={{ opacity: 0.45 }}>·</span>
              {isSelector ? (
                <label
                  className="v4-complex-selector"
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 22px 2px 8px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "var(--v4-text-info)",
                    background: "var(--v4-bg-info)",
                    border: "1px solid var(--v4-border-info)",
                    borderRadius: 999,
                    cursor: "pointer",
                    lineHeight: 1.2,
                  }}
                >
                  <Building2 size={11} strokeWidth={2} />
                  {complexValue}
                  <ChevronDown
                    size={11}
                    strokeWidth={2}
                    style={{
                      position: "absolute",
                      right: 6,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <select
                    value={complexValue}
                    onChange={(e) =>
                      (complex as Exclude<ComplexProp, string>).onChange(
                        e.target.value
                      )
                    }
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                      border: 0,
                    }}
                  >
                    {(complex as Exclude<ComplexProp, string>).options.map(
                      (opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      )
                    )}
                  </select>
                </label>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--v4-text-secondary)",
                  }}
                >
                  <Building2 size={11} strokeWidth={1.8} />
                  {complexValue}
                </span>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {progress ? <ProgressDonut done={progress.done} total={progress.total} /> : null}
        {actions ? <div>{actions}</div> : null}
      </div>
    </header>
  );
}
