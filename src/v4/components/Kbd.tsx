import { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="v4-kbd">{children}</kbd>;
}
