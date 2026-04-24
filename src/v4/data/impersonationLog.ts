import { useEffect, useState } from "react";

// TEMPORARY: 대리 접속 이력을 localStorage에 저장. 백엔드 audit_log 테이블 추가 시 이 파일 제거.
const STORAGE_KEY = "v4.impersonationLog";
const MAX_ENTRIES = 50;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 같은 manager→assignee 연속 진입은 5분 내 1회만 기록

export type ImpersonationEntry = {
  at: string; // ISO timestamp
  managerId: string;
  assignee: string;
};

function read(): ImpersonationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e): e is ImpersonationEntry =>
          !!e &&
          typeof e.at === "string" &&
          typeof e.managerId === "string" &&
          typeof e.assignee === "string",
      );
    }
  } catch {
    /* noop */
  }
  return [];
}

function write(list: ImpersonationEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    /* noop */
  }
}

export function logImpersonation(managerId: string, assignee: string) {
  if (!managerId || !assignee) return;
  const prev = read();
  const head = prev[0];
  if (head && head.managerId === managerId && head.assignee === assignee) {
    const prevTime = Date.parse(head.at);
    if (!Number.isNaN(prevTime) && Date.now() - prevTime < DEDUPE_WINDOW_MS) return;
  }
  write([{ at: new Date().toISOString(), managerId, assignee }, ...prev]);
}

export function useImpersonationLog() {
  const [list, setList] = useState<ImpersonationEntry[]>(() => read());
  useEffect(() => {
    const refresh = () => setList(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return list;
}
