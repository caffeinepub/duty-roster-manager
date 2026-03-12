import { useCallback, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
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
