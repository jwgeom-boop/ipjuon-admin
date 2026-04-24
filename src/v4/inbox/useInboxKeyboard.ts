import { useEffect } from "react";

export interface UseInboxKeyboardOptions {
  onNext: () => void;
  onPrev: () => void;
  onOpen: () => void;
  onComplete: () => void;
  onSms?: () => void;
  onCall?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useInboxKeyboard(opts: UseInboxKeyboardOptions) {
  useEffect(() => {
    if (opts.enabled === false) return;
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.tagName === "SELECT" ||
          tgt.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          opts.onNext();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          opts.onPrev();
          break;
        case "Enter":
          e.preventDefault();
          opts.onOpen();
          break;
        case "e":
          e.preventDefault();
          opts.onComplete();
          break;
        case "m":
          if (opts.onSms) {
            e.preventDefault();
            opts.onSms();
          }
          break;
        case "c":
          if (opts.onCall) {
            e.preventDefault();
            opts.onCall();
          }
          break;
        case "Escape":
          if (opts.onEscape) {
            e.preventDefault();
            opts.onEscape();
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opts]);
}
