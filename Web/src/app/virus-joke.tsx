"use client";

import { useEffect, useState } from "react";

export function VirusJoke() {
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    let id = 0;
    const interval = setInterval(() => {
      setPopups(prev => [
        ...prev,
        {
          id: id++,
          x: Math.random() * 80,
          y: Math.random() * 80,
          color: Math.random() > 0.5 ? "red" : "blue"
        }
      ]);
    }, 100);

    const alertInterval = setInterval(() => {
      try {
        alert("¡ATENCIÓN! Virus detectado. El juego se va a cerrar. Imposible cancelar.");
      } catch (e) {}
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(alertInterval);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999999 }}>
      {popups.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            color: "white",
            border: "5px solid yellow",
            padding: "20px",
            fontWeight: 900,
            fontSize: "24px",
            boxShadow: "0 0 50px rgba(0,0,0,0.8)",
            pointerEvents: "auto",
            textTransform: "uppercase",
            cursor: "not-allowed"
          }}
          onClick={() => {
            try {
              alert("¡NO PUEDES CERRARLO!");
            } catch (e) {}
          }}
        >
          ⚠️ ERROR FATAL: EL JUEGO SE VA A CERRAR ⚠️
        </div>
      ))}
    </div>
  );
}
