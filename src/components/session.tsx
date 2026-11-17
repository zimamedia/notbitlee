import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { SessionContext } from "@/components/session-context.ts";
import { ApiError, api } from "@/lib/api.ts";
import type { SessionUser } from "@/lib/types.ts";

export function RequireSession() {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; user: SessionUser } | { kind: "anonymous" } | { kind: "error"; message: string }>({
    kind: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    api<SessionUser>("/api/me")
      .then((user) => {
        if (!cancelled) setState({ kind: "ready", user });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setState({ kind: "anonymous" });
          return;
        }
        setState({ kind: "error", message: error instanceof Error ? error.message : "Request failed." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") return <Centered>Checking your session…</Centered>;
  if (state.kind === "anonymous") return <Navigate to="/login" replace />;
  if (state.kind === "error") {
    return (
      <Centered>
        <p>Could not check your session.</p>
        <p className="mt-2 text-sm text-muted">{state.message}</p>
        <button className="mt-4 underline" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </Centered>
    );
  }

  return (
    <SessionContext.Provider value={state.user}>
      <Outlet />
    </SessionContext.Provider>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center" role="status">
      <div>{children}</div>
    </div>
  );
}
