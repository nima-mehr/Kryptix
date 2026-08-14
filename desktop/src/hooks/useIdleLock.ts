import { useEffect, useRef } from "react";

/**
 * Calls onIdle after `timeoutMs` of no mouse/keyboard/touch activity.
 * Resets the timer on any user interaction.
 */
export function useIdleLock(
  enabled: boolean,
  timeoutMs: number,
  onIdle: () => void
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        onIdleRef.current();
      }, timeoutMs);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ] as const;

    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, timeoutMs]);
}

/** Preset idle timeouts (ms) */
export const IDLE_OPTIONS = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "Never", ms: 0 },
] as const;

const STORAGE_KEY = "kryptix_idle_lock_ms";

export function loadIdleTimeout(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return 5 * 60_000; // default 5 min
    const n = Number(v);
    return Number.isFinite(n) ? n : 5 * 60_000;
  } catch {
    return 5 * 60_000;
  }
}

export function saveIdleTimeout(ms: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    /* ignore */
  }
}
