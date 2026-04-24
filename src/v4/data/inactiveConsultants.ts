import { useCallback, useEffect, useState } from "react";

// TEMPORARY: 상담사 비활성화(퇴사) 상태를 localStorage에 저장.
// 백엔드에 `accounts.is_active` 컬럼이 추가되면 이 파일 제거.
const STORAGE_KEY = "v4.inactiveConsultants";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    /* noop */
  }
  return [];
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function useInactiveConsultants() {
  const [list, setList] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setList(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const deactivate = useCallback((name: string) => {
    setList((prev) => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      write(next);
      return next;
    });
  }, []);

  const reactivate = useCallback((name: string) => {
    setList((prev) => {
      const next = prev.filter((n) => n !== name);
      write(next);
      return next;
    });
  }, []);

  const isInactive = useCallback((name: string) => list.includes(name), [list]);

  return { inactiveList: list, isInactive, deactivate, reactivate };
}
