import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { mapConsultations, type ConsultationDto } from "./consultationMapper";
import type { TaskItem } from "../home/TaskRow";

interface State {
  tasks: TaskItem[];
  loading: boolean;
  error: string | null;
}

// 상담사가 신규 등록하면 팀장(같은 vendor_name)도 본인 인박스에서 바로 봐야 하므로
// 가벼운 폴링으로 실시간성 확보. SSE/WebSocket 도입은 추후 별개 작업.
const POLL_INTERVAL_MS = 10_000;

// 본인 담당 건만 백엔드에서 fetch. JWT 기반이라 별도 인자 불필요.
export function useMyConsultations() {
  const [state, setState] = useState<State>({ tasks: [], loading: true, error: null });

  // silent=true 로 호출 시 로딩 스피너/에러 표시 없이 백그라운드 갱신만 수행.
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // v4 인박스는 완료(done) 카테고리에서 대출 실행 완료 건을 표시해야 하므로
      // include_done=true 로 항상 포함해서 받아온다. (cancel 은 백엔드에서 계속 제외)
      const raw: ConsultationDto[] = await api.getMyConsultations(true);
      const mapped = mapConsultations(raw);
      setState((s) => ({ tasks: mapped, loading: silent ? s.loading : false, error: null }));
    } catch (e) {
      if (silent) return; // 백그라운드 폴링 실패는 UI 흔들지 않고 조용히 무시
      const msg = e instanceof Error ? e.message : "조회 실패";
      setState({ tasks: [], loading: false, error: msg });
    }
  }, []);

  // 최초 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 폴링 + 탭 가시성/포커스 동기화
  useEffect(() => {
    if (typeof document === "undefined") return;
    let timer: number | undefined;
    const stop = () => {
      if (timer != null) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
    const start = () => {
      stop();
      timer = window.setInterval(() => {
        void fetchData(true);
      }, POLL_INTERVAL_MS);
    };
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      void fetchData(true); // 즉시 한 번 갱신
      start();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
