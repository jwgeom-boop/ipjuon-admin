import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { mapConsultations, type ConsultationDto } from "./consultationMapper";
import type { TaskItem } from "../home/TaskRow";

interface State {
  tasks: TaskItem[];
  loading: boolean;
  error: string | null;
}

// 본인 담당 건만 백엔드에서 fetch. JWT 기반이라 별도 인자 불필요.
export function useMyConsultations() {
  const [state, setState] = useState<State>({ tasks: [], loading: true, error: null });

  const fetchData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // v4 인박스는 완료(done) 카테고리에서 대출 실행 완료 건을 표시해야 하므로
      // include_done=true 로 항상 포함해서 받아온다. (cancel 은 백엔드에서 계속 제외)
      const raw: ConsultationDto[] = await api.getMyConsultations(true);
      setState({ tasks: mapConsultations(raw), loading: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "조회 실패";
      setState({ tasks: [], loading: false, error: msg });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
