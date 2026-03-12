import { useCallback, useEffect, useRef, useState } from "react";

const LS_SYNC_EVENT = "duty_roster_ls_sync";

function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Keep defaultValue stable across renders without triggering effect re-runs
  const defaultRef = useRef(defaultValue);

  const [state, setState] = useState<T>(() =>
    readFromStorage(key, defaultRef.current),
  );

  // Re-sync when another component updates the same key in this tab
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) {
        setState(readFromStorage(key, defaultRef.current));
      }
    };
    window.addEventListener(LS_SYNC_EVENT, handler);
    return () => window.removeEventListener(LS_SYNC_EVENT, handler);
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
          // Notify all other hook instances using the same key
          window.dispatchEvent(
            new CustomEvent<string>(LS_SYNC_EVENT, { detail: key }),
          );
        } catch {
          // storage full or unavailable
        }
        return next;
      });
    },
    [key],
  );

  return [state, setValue];
}
