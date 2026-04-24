import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const FAILURE_THRESHOLD = 3;
const DEBOUNCE_MS = 4000;

// 위저드 입력값을 백엔드에 4초 디바운스로 자동 저장.
// 연속 실패가 임계치(3회)에 도달하면 토스트로 1회 안내.
export function useWizardAutosave<T>(
  id: string | undefined,
  data: T,
  toPayload: (d: T) => Record<string, unknown>,
): { isPersistableId: boolean } {
  const isPersistableId = !!id && !id.startsWith("new-");
  const failureCount = useRef(0);
  const warned = useRef(false);

  useEffect(() => {
    if (!isPersistableId) return;
    const t = setTimeout(async () => {
      try {
        await api.updateBankConsultation(id!, toPayload(data));
        failureCount.current = 0;
        warned.current = false;
      } catch (e) {
        failureCount.current += 1;
        console.warn("[wizard autosave]", e);
        if (failureCount.current >= FAILURE_THRESHOLD && !warned.current) {
          warned.current = true;
          toast.warning("자동 저장 실패가 반복됩니다", {
            description:
              "네트워크 또는 서버 상태를 확인해 주세요. 입력은 브라우저에 임시 저장되어 있습니다.",
          });
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, id, isPersistableId]);

  return { isPersistableId };
}
