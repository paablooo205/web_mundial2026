"use client";

import { useEffect, useState } from "react";

// El mundial empieza el jueves 11 de junio de 2026
const TARGET_DATE = new Date("2026-06-11T00:00:00Z").getTime();

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date().getTime();
      const diff = TARGET_DATE - now;

      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ d, h, m, s });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null; // Evitar desajuste de hidratación SSR

  if (timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0) {
    return (
      <span style={{ fontSize: "0.6rem", letterSpacing: "0.05em", color: "var(--usa-red-bright)" }}>
        ¡El Mundial ha comenzado!
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: "4px", alignItems: "center", fontSize: "0.6rem", color: "var(--usa-white)", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--border)", marginLeft: "6px" }}>
      <span>⏱</span>
      <span>{timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s</span>
    </span>
  );
}
