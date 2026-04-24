import { useCallback, useEffect, useState } from "react";

export type WizardKind = "execution" | "signing" | "consultation" | "reservation";

function draftKey(kind: WizardKind, id: string) {
  return `v4.wizard.${kind}.${id}.draft`;
}

function readDraft<T>(key: string): Partial<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Partial<T>;
  } catch {
    /* noop */
  }
  return null;
}

export function useWizardDraft<T extends object>(
  kind: WizardKind,
  id: string,
  makeInitial: (id: string) => T,
  // serverOverride: 매번 base/draft 위에 덮어씌울 필드 (서버 데이터가 항상 우선해야 할 때)
  serverOverride?: Partial<T>
) {
  const key = draftKey(kind, id);

  const [data, setData] = useState<T>(() => {
    const base = makeInitial(id);
    const draft = readDraft<T>(key);
    const merged = draft ? ({ ...base, ...draft } as T) : base;
    return serverOverride ? ({ ...merged, ...serverOverride } as T) : merged;
  });

  const [savedAt, setSavedAt] = useState<Date | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key) ? new Date() : null;
  });

  // Re-hydrate on id change
  useEffect(() => {
    const base = makeInitial(id);
    const draft = readDraft<T>(key);
    const merged = draft ? ({ ...base, ...draft } as T) : base;
    setData(serverOverride ? ({ ...merged, ...serverOverride } as T) : merged);
    setSavedAt(
      typeof window !== "undefined" && window.localStorage.getItem(key)
        ? new Date()
        : null
    );
  }, [id, key]);

  // Debounced save on data change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(data));
        setSavedAt(new Date());
      } catch {
        /* noop */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, key]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
    setSavedAt(null);
  }, [key]);

  const hasDraft = useCallback(() => {
    if (typeof window === "undefined") return false;
    return !!window.localStorage.getItem(key);
  }, [key]);

  return { data, setData, savedAt, clearDraft, hasDraft };
}
