import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api.ts";

/** Loads JSON from the API and reloads when the path changes or `reload` is called. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const key = path === null ? null : `${path}#${attempt}`;

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    api<T>(path)
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Request failed.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(`${path}#${attempt}`);
      });
    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { data, setData, error, loading: key !== loadedKey, reload };
}
