import { CSSProperties, ReactNode, useMemo, useState } from "react";
import {
  DSR_CONSTANTS,
  FINANCIAL_SECTOR_LABEL,
  FinancialSector,
  RATE_TYPE_LABEL,
  REPAYMENT_TYPE_LABEL,
  RateType,
  RepaymentType,
  getStressBaseRate,
  getStressRatio,
} from "./constants";
import { calculateDSR, ExistingLoan, NewMortgage } from "./calculator";

interface SimInputs {
  spouseIncome: number;
  isCapitalArea: boolean;
  /** 규제지역(투기과열·조정·토허) 여부. 10.15 대책으로 수도권·규제만 +3.0%p */
  isRegulated: boolean;
  /** 1금융권(DSR 40%) vs 상호금융(DSR 50%) */
  sector: FinancialSector;
  newRate: number;
  newRateType: RateType;
  newRepayment: RepaymentType;
  existingCreditRate: number;
  existingMortgageRate: number;
  existingMortgageRemainingYears: number;
  creditLineLimit: number;
  creditLineRate: number;
}

export interface DsrSimulatorCardProps {
  annualIncome: number;
  existingCreditLoan: number;
  existingMortgage: number;
  desiredLoanAmount: number;
  loanYears: number;
  interestRate: number;
}

export function DsrSimulatorCard({
  annualIncome,
  existingCreditLoan,
  existingMortgage,
  desiredLoanAmount,
  loanYears,
  interestRate,
}: DsrSimulatorCardProps) {
  const [sim, setSim] = useState<SimInputs>({
    spouseIncome: 0,
    isCapitalArea: true,
    isRegulated: true,           // 기본: 수도권·규제 (보수적 추정)
    sector: "bank",              // 기본: 1금융권
    newRate: 4.5,
    newRateType: "variable",
    newRepayment: "principal_interest",
    existingCreditRate: 5.5,
    existingMortgageRate: 4.3,
    existingMortgageRemainingYears: 25,
    creditLineLimit: 0,
    creditLineRate: 5.5,
  });

  const result = useMemo(() => {
    const existingLoans: ExistingLoan[] = [];
    if (existingCreditLoan > 0) {
      existingLoans.push({
        id: "ec",
        type: "신용대출",
        balance: existingCreditLoan,
        rate: (sim.existingCreditRate || 0) / 100,
      });
    }
    if (existingMortgage > 0) {
      existingLoans.push({
        id: "em",
        type: "주택담보대출",
        balance: existingMortgage,
        rate: (sim.existingMortgageRate || 0) / 100,
        remainingYears: sim.existingMortgageRemainingYears || 25,
        rateType: "variable",
      });
    }
    if (sim.creditLineLimit > 0) {
      existingLoans.push({
        id: "cl",
        type: "마이너스통장",
        limit: sim.creditLineLimit,
        rate: (sim.creditLineRate || 0) / 100,
      });
    }

    const newLoan: NewMortgage | undefined =
      desiredLoanAmount > 0
        ? {
            amount: desiredLoanAmount,
            years: loanYears || 30,
            rate: ((sim.newRate || interestRate || 0) / 100) || 0,
            rateType: sim.newRateType,
            repaymentType: sim.newRepayment,
          }
        : undefined;

    return calculateDSR({
      income: annualIncome,
      spouseIncome: sim.spouseIncome > 0 ? sim.spouseIncome : undefined,
      property: { isCapitalArea: sim.isCapitalArea, isRegulated: sim.isRegulated },
      sector: sim.sector,
      existingLoans,
      newLoan,
    });
  }, [
    annualIncome,
    existingCreditLoan,
    existingMortgage,
    desiredLoanAmount,
    loanYears,
    interestRate,
    sim,
  ]);

  const dsrPct = result.dsr * 100;
  const limitPct = result.limit * 100;
  const nearLimit = dsrPct >= (limitPct - 5) && dsrPct <= limitPct;
  const over = dsrPct > limitPct;

  const statusLabel = over
    ? "한도 초과 예상"
    : nearLimit
    ? `DSR ${limitPct.toFixed(0)}% 근접`
    : `한도 내 · 여유 있음`;
  const statusColor = over
    ? "var(--v4-danger)"
    : nearLimit
    ? "var(--v4-warning)"
    : "var(--v4-success)";

  const limitAmount = result.income * result.limit;
  const overageAmount = Math.max(0, result.totalAnnual - limitAmount);

  const MAX_BAR_PCT = limitPct * 1.5;
  const barFillPct = result.income > 0 ? Math.min(dsrPct / MAX_BAR_PCT, 1) * 100 : 0;
  const limitMarkerPct = MAX_BAR_PCT > 0 ? (limitPct / MAX_BAR_PCT) * 100 : 0;

  const baseRatePct = sim.newRate || interestRate || 0;
  const areaAddPct = getStressBaseRate(sim.isCapitalArea, sim.isRegulated) * 100;
  const stressAddPct = areaAddPct * getStressRatio(sim.newRateType);
  const stressedRatePct = baseRatePct + stressAddPct;
  const areaLabel = sim.isCapitalArea
    ? sim.isRegulated ? "수도권·규제" : "수도권 비규제"
    : "지방";

  return (
    <section
      style={{
        background: "var(--v4-bg-primary)",
        border: "1px solid var(--v4-border-tertiary)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "6px 12px 4px",
          borderBottom: "1px dashed var(--v4-border-tertiary)",
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--v4-text-secondary)" }}>
          DSR 시뮬레이션
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v4-warning)", letterSpacing: 0.3 }}>
            💡 개략치 · 스트레스 DSR (3단계)
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 10,
              color: "var(--v4-warning)",
              background: "var(--v4-bg-primary)",
              border: "1px solid var(--v4-warning)",
              borderRadius: 3,
              padding: "1px 5px",
              fontWeight: 500,
            }}
          >
            참고용 · 예상치
          </span>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, 1.1fr) minmax(280px, 1fr)",
          gap: 0,
        }}
      >
        {/* LEFT: inputs */}
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <MiniRow label="배우자 소득">
            <MiniMoney
              value={sim.spouseIncome}
              onChange={(n) => setSim((s) => ({ ...s, spouseIncome: n }))}
            />
          </MiniRow>

          <MiniRow label="주담대 지역">
            <ChipPair
              value={sim.isCapitalArea}
              onChange={(v) => setSim((s) => ({ ...s, isCapitalArea: v }))}
              on="수도권"
              off="지방"
            />
          </MiniRow>

          {sim.isCapitalArea && (
            <MiniRow label="규제지역">
              <ChipPair
                value={sim.isRegulated}
                onChange={(v) => setSim((s) => ({ ...s, isRegulated: v }))}
                on="규제 (서울+경기12)"
                off="비규제"
              />
            </MiniRow>
          )}

          <MiniRow label="대출 신청처">
            <SelectChips
              value={sim.sector}
              onChange={(v) => setSim((s) => ({ ...s, sector: v }))}
              options={[
                ["bank", "1금융 (DSR 40%)"],
                ["nbfi", "상호금융 (DSR 50%)"],
              ]}
            />
          </MiniRow>

          <div style={dividerStyle} />

          <SectionHead>신규 잔금대출</SectionHead>
          <MiniRow label="예상 금리">
            <MiniPct
              value={sim.newRate}
              onChange={(n) => setSim((s) => ({ ...s, newRate: n }))}
            />
          </MiniRow>
          <MiniRow label="금리 유형">
            <SelectChips
              value={sim.newRateType}
              onChange={(v) => setSim((s) => ({ ...s, newRateType: v }))}
              options={[
                ["variable", RATE_TYPE_LABEL.variable],
                ["mixed_3y", RATE_TYPE_LABEL.mixed_3y],
                ["mixed_5y", RATE_TYPE_LABEL.mixed_5y],
              ]}
            />
          </MiniRow>
          <MiniRow label="상환 방식">
            <SelectChips
              value={sim.newRepayment}
              onChange={(v) => setSim((s) => ({ ...s, newRepayment: v }))}
              options={[
                ["principal_interest", REPAYMENT_TYPE_LABEL.principal_interest],
                ["principal_only", REPAYMENT_TYPE_LABEL.principal_only],
                ["maturity_only", REPAYMENT_TYPE_LABEL.maturity_only],
              ]}
            />
          </MiniRow>

          {(existingCreditLoan > 0 || existingMortgage > 0 || sim.creditLineLimit > 0) && (
            <>
              <div style={dividerStyle} />
              <SectionHead>기존 대출 금리 · 기간</SectionHead>
              {existingMortgage > 0 && (
                <MiniRow label="주담대">
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <MiniPct
                      value={sim.existingMortgageRate}
                      onChange={(n) => setSim((s) => ({ ...s, existingMortgageRate: n }))}
                    />
                    <MiniYears
                      value={sim.existingMortgageRemainingYears}
                      onChange={(n) =>
                        setSim((s) => ({ ...s, existingMortgageRemainingYears: n }))
                      }
                    />
                  </span>
                </MiniRow>
              )}
              {existingCreditLoan > 0 && (
                <MiniRow label="신용대출">
                  <MiniPct
                    value={sim.existingCreditRate}
                    onChange={(n) => setSim((s) => ({ ...s, existingCreditRate: n }))}
                  />
                </MiniRow>
              )}
              <MiniRow label="마이너스통장">
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <MiniMoney
                    value={sim.creditLineLimit}
                    onChange={(n) => setSim((s) => ({ ...s, creditLineLimit: n }))}
                  />
                  <MiniPct
                    value={sim.creditLineRate}
                    onChange={(n) => setSim((s) => ({ ...s, creditLineRate: n }))}
                  />
                </span>
              </MiniRow>
            </>
          )}
        </div>

        {/* RIGHT: result card */}
        <aside
          style={{
            background: "var(--v4-bg-warning)",
            borderLeft: "1px dashed var(--v4-border-tertiary)",
            padding: "8px 12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: -0.5,
              color: statusColor,
              lineHeight: 1.05,
            }}
            className="v4-tabular"
          >
            {result.income > 0 ? `${dsrPct.toFixed(1)}%` : "—"}
          </div>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 500,
              color: statusColor,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {result.income > 0 ? (
              <>
                <span>{statusLabel}</span>
                {over && (
                  <span className="v4-tabular" style={{ fontSize: 11 }}>
                    · +{fmt(Math.round(overageAmount))}원 초과
                  </span>
                )}
                {!over && result.headroom > 0 && (
                  <span className="v4-tabular" style={{ fontSize: 11, color: "var(--v4-text-tertiary)" }}>
                    · 여유 {fmt(Math.round(result.headroom))}원
                  </span>
                )}
              </>
            ) : (
              <span>연소득 입력 필요</span>
            )}
          </div>

          {/* Progress bar (value vs limit) */}
          {result.income > 0 && (
            <div style={{ position: "relative", marginTop: 2, marginBottom: 10 }}>
              <div
                style={{
                  height: 8,
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(217, 119, 6, 0.2)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barFillPct}%`,
                    background: statusColor,
                    transition: "width 0.2s ease-out",
                  }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: -3,
                  bottom: -3,
                  left: `${limitMarkerPct}%`,
                  width: 2,
                  background: "var(--v4-text-primary)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: `${limitMarkerPct}%`,
                  transform: "translateX(-50%)",
                  fontSize: 9.5,
                  color: "var(--v4-text-tertiary)",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                ↑ 한도 {limitPct.toFixed(0)}%
              </div>
            </div>
          )}

          <div style={{ ...dividerStyle, borderColor: "rgba(217, 119, 6, 0.2)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11.5 }}>
            {sim.spouseIncome > 0 ? (
              <>
                <BreakRow label="합산소득" value={fmt(result.income)} tabular bold />
                <BreakRow label="· 본인" value={fmt(annualIncome)} tabular dim />
                <BreakRow label="· 배우자" value={fmt(sim.spouseIncome)} tabular dim />
              </>
            ) : (
              <BreakRow label="연소득" value={fmt(result.income)} tabular />
            )}

            {result.breakdown.map((b) => (
              <div key={b.id}>
                <BreakRow
                  label={b.label}
                  value={fmt(Math.round(b.annual))}
                  note={b.note}
                  tabular
                />
                {b.id === "new" && stressedRatePct > 0 && (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--v4-text-tertiary)",
                      paddingLeft: 10,
                      marginTop: 1,
                      lineHeight: 1.4,
                    }}
                    className="v4-tabular"
                  >
                    스트레스 {stressedRatePct.toFixed(2)}% = 기준 {baseRatePct.toFixed(2)}% +{" "}
                    {stressAddPct.toFixed(2)}% ({areaLabel}·{RATE_TYPE_LABEL[sim.newRateType]})
                  </div>
                )}
              </div>
            ))}

            <div style={{ ...dividerStyle, borderColor: "rgba(217, 119, 6, 0.2)" }} />

            <BreakRow
              label="연 원리금 합계"
              value={fmt(Math.round(result.totalAnnual))}
              bold
              tabular
            />
            {result.income > 0 && (
              <BreakRow
                label={`DSR ${limitPct.toFixed(0)}% 한도`}
                value={fmt(Math.round(limitAmount))}
                tabular
                dim
              />
            )}
            {over ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "var(--v4-danger)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span>초과 금액</span>
                <span className="v4-tabular">+{fmt(Math.round(overageAmount))}</span>
              </div>
            ) : result.headroom > 0 ? (
              <BreakRow
                label="여유 금액"
                value={fmt(Math.round(result.headroom))}
                tabular
                dim
              />
            ) : null}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              color: "var(--v4-text-tertiary)",
              lineHeight: 1.4,
            }}
          >
            ※ 은행 심사와 다를 수 있습니다. {FINANCIAL_SECTOR_LABEL[sim.sector]} · 규제 기준일 {DSR_CONSTANTS.LAST_UPDATED} (10.15 대책).
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ---------- styled sub-components ---------- */

const dividerStyle: CSSProperties = {
  height: 0,
  borderTop: "1px dashed var(--v4-border-tertiary)",
  margin: "2px 0",
};

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v4-text-tertiary)", letterSpacing: 0.4 }}>
      {children}
    </div>
  );
}

function MiniRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr",
        alignItems: "center",
        columnGap: 8,
        minHeight: 22,
      }}
    >
      <span style={{ fontSize: 11.5, color: "var(--v4-text-tertiary)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center" }}>{children}</span>
    </div>
  );
}

function ChipPair<T extends boolean>({
  value,
  onChange,
  on,
  off,
}: {
  value: T;
  onChange: (v: boolean) => void;
  on: string;
  off: string;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button type="button" onClick={() => onChange(true)} style={chipStyle(!!value)}>
        {on}
      </button>
      <button type="button" onClick={() => onChange(false)} style={chipStyle(!value)}>
        {off}
      </button>
    </span>
  );
}

function SelectChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "nowrap" }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={chipStyle(v === value)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function chipStyle(active: boolean): CSSProperties {
  return {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 3,
    border: "1px solid",
    borderColor: active ? "var(--v4-text-primary)" : "var(--v4-border-tertiary)",
    background: active ? "var(--v4-text-primary)" : "var(--v4-bg-primary)",
    color: active ? "#fff" : "var(--v4-text-secondary)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: active ? 500 : 400,
    whiteSpace: "nowrap",
  };
}

function MiniMoney({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={value ? value.toLocaleString("ko-KR") : ""}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d]/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        className="v4-tabular"
        style={miniFieldStyle(90, "right")}
      />
      <span style={miniUnitStyle}>원</span>
    </span>
  );
}

function MiniPct({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={value ? String(value) : ""}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d.]/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        className="v4-tabular"
        style={miniFieldStyle(52, "right")}
      />
      <span style={miniUnitStyle}>%</span>
    </span>
  );
}

function MiniYears({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={value ? String(value) : ""}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d]/g, "");
          onChange(cleaned ? Number(cleaned) : 0);
        }}
        className="v4-tabular"
        style={miniFieldStyle(44, "right")}
      />
      <span style={miniUnitStyle}>년</span>
    </span>
  );
}

function miniFieldStyle(width: number, align: "left" | "right"): CSSProperties {
  return {
    width,
    border: "1px solid var(--v4-border-tertiary)",
    background: "var(--v4-bg-secondary)",
    outline: "none",
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 12,
    textAlign: align,
    fontFamily: "inherit",
    fontWeight: 500,
    color: "var(--v4-text-primary)",
  };
}

const miniUnitStyle: CSSProperties = {
  fontSize: 10.5,
  color: "var(--v4-text-tertiary)",
};

function BreakRow({
  label,
  value,
  note,
  bold,
  tabular,
  dim,
}: {
  label: string;
  value: string;
  note?: string;
  bold?: boolean;
  tabular?: boolean;
  dim?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span
        style={{
          color: dim ? "var(--v4-text-tertiary)" : "var(--v4-text-secondary)",
          fontSize: 11.5,
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
        {note && (
          <span style={{ marginLeft: 4, fontSize: 10, color: "var(--v4-text-tertiary)" }}>· {note}</span>
        )}
      </span>
      <span
        className={tabular ? "v4-tabular" : undefined}
        style={{
          color: dim ? "var(--v4-text-tertiary)" : "var(--v4-text-primary)",
          fontSize: bold ? 13 : 12,
          fontWeight: bold ? 600 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function fmt(n: number): string {
  if (!isFinite(n) || n === 0) return "0";
  return n.toLocaleString("ko-KR");
}
