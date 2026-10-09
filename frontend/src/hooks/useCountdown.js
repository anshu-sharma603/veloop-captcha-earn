import { useEffect, useState } from 'react';

/** Seconds left until an ISO date. Display only: the server enforces expiry. */
export function useCountdown(expiresAt, onZero) {
  const calc = () => (expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const id = setInterval(() => {
      const s = calc(); setLeft(s);
      if (s <= 0) { clearInterval(id); onZero?.(); }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  return left;
}
