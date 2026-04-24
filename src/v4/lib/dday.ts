export function diffDaysFromToday(executionDate?: string): number | null {
  if (!executionDate || !/^\d{4}-\d{2}-\d{2}$/.test(executionDate)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(executionDate + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDday(diff: number | null): string {
  if (diff == null) return "—";
  if (diff < 0) return "사고";
  if (diff === 0) return "D-day";
  return `D-${diff}`;
}

export function ddayTone(diff: number | null): { color: string; bg: string } {
  if (diff == null) return { color: "var(--v4-text-tertiary)", bg: "var(--v4-bg-tertiary)" };
  if (diff < 0) return { color: "#fff", bg: "var(--v4-danger)" };
  if (diff === 0) return { color: "var(--v4-danger)", bg: "var(--v4-bg-danger)" };
  if (diff <= 2) return { color: "var(--v4-warning)", bg: "var(--v4-bg-warning)" };
  return { color: "var(--v4-text-info)", bg: "var(--v4-bg-info)" };
}

export function ddaySortKey(diff: number | null): number {
  if (diff == null) return 1_000_000;
  if (diff < 0) return -1_000_000 + -diff;
  return diff;
}
