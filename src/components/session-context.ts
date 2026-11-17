import { createContext, useContext } from "react";

import type { SessionUser } from "@/lib/types.ts";

export const SessionContext = createContext<SessionUser | null>(null);

export function useSession(): SessionUser {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session is missing");
  return session;
}
