"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  parsePreferences,
  preferencesKey,
  type LocalPreferences,
} from "@/lib/onboarding";
const eventName = "daytlas:preferences";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
export function useLocalPreferences(scope: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(preferencesKey(scope));
      } catch {
        return null;
      }
    },
    () => null,
  );
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  function save(value: LocalPreferences) {
    localStorage.setItem(preferencesKey(scope), JSON.stringify(value));
    window.dispatchEvent(new Event(eventName));
  }
  function clear() {
    localStorage.removeItem(preferencesKey(scope));
    window.dispatchEvent(new Event(eventName));
  }
  return { preferences, save, clear };
}
