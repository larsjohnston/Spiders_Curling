"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "spiders.me";
const EVENT = "spiders-me-change";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The player this device belongs to, remembered in localStorage. */
export function useMe(): [string | null, (id: string | null) => void] {
  const me = useSyncExternalStore(subscribe, read, () => null);
  const setMe = useCallback((id: string | null) => {
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [me, setMe];
}
