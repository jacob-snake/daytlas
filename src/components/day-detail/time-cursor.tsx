"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
const TimeContext = createContext<{
  time: number | null;
  setTime: (time: number | null) => void;
}>({ time: null, setTime: () => {} });
export function TimeCursorGroup({ children }: { children: ReactNode }) {
  const [time, setTime] = useState<number | null>(null);
  return (
    <TimeContext.Provider value={{ time, setTime }}>
      {children}
    </TimeContext.Provider>
  );
}
export const useTimeCursor = () => useContext(TimeContext);
