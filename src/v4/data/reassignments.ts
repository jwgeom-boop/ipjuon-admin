import { useCallback, useEffect, useState } from "react";
import type { TaskItem } from "../home/TaskRow";

// TEMPORARY: 담당자 재배정을 localStorage에 오버라이드로 저장.
// 백엔드에 `customers.assignee_account_id` FK가 추가되면 이 파일 제거.
const STORAGE_KEY = "v4.reassignments";

export type ReassignMap = Record<string, string>; // taskId → assignee name

function read(): ReassignMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ReassignMap;
  } catch {
    /* noop */
  }
  return {};
}

function write(map: ReassignMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

export function useReassignments() {
  const [map, setMap] = useState<ReassignMap>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMap(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const reassign = useCallback((taskId: string, assignee: string) => {
    setMap((prev) => {
      const next = { ...prev, [taskId]: assignee };
      write(next);
      return next;
    });
  }, []);

  const clearAssignment = useCallback((taskId: string) => {
    setMap((prev) => {
      const { [taskId]: _removed, ...rest } = prev;
      write(rest);
      return rest;
    });
  }, []);

  return { map, reassign, clearAssignment };
}

export function getEffectiveAssignee(task: TaskItem, map: ReassignMap): string {
  return map[task.id] ?? task.assignee ?? "";
}
