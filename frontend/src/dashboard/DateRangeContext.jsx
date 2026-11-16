import { createContext, useContext, useEffect, useState } from "react";

const DateRangeContext = createContext({ days: 30, setDays: () => {} });
const KEY = "creatoriq_days";

export function DateRangeProvider({ children }) {
  const [days, setDays] = useState(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      return [7, 30, 90].includes(v) ? v : 30;
    } catch {
      return 30;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, String(days)); } catch { /* ignore */ }
  }, [days]);

  return <DateRangeContext.Provider value={{ days, setDays }}>{children}</DateRangeContext.Provider>;
}

export const useDateRange = () => useContext(DateRangeContext);
