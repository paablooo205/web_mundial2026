"use client";

import { useEffect, useState } from "react";

export function VirusJoke() {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);

  useEffect(() => {
    // Si ya han pasado las 18:00 del 24 de junio de 2026 (hora de España), el virus se desactiva solo
    const expirationTime = new Date("2026-06-24T18:00:00+02:00").getTime();
    if (Date.now() >= expirationTime) {
      return;
    }

    // Stage 1: Terminal hacking (starts at 2 seconds)
    const stage1 = setTimeout(() => {
      setStage(1);
      document.body.style.overflow = "hidden";
    }, 2000);

    // Terminal log generator (Matrix style background)
    const interval = setInterval(() => {
      setLogs((prev) => {
        const newLogs = [...prev];
        if (newLogs.length > 50) newLogs.shift();
        
        const chars = "0123456789ABCDEF!@#$%^&*()_+-=[]{}|;:',.<>?/`~";
        let randomStr = "";
        for(let i=0; i<60; i++) randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        
        const memoryAddr = "0x" + Math.floor(Math.random() * 4294967295).toString(16).toUpperCase().padStart(8, '0');
        newLogs.push(`[${memoryAddr}] ${randomStr}`);
        return newLogs;
      });
    }, 30);

    // Random dramatic popups generator
    let popupId = 0;
    const popupInterval = setInterval(() => {
      if (stage >= 1) {
        setPopups(prev => {
          const texts = [
            "⚠️ SYSTEM CORRUPT", 
            "UPLOADING DATA...", 
            "ACCESS DENIED", 
            "ENCRYPTING DRIVE C:", 
            "FATAL ERROR", 
            "KERNEL PANIC"
          ];
          const colors = ["red", "darkred", "#aa0000", "black"];
          return [...prev, {
            id: popupId++,
            x: Math.random() * 70,
            y: Math.random() * 80,
            text: texts[Math.floor(Math.random() * texts.length)],
            color: colors[Math.floor(Math.random() * colors.length)]
          }];
        });
      }
    }, 400);

    // Stage 2: BSOD (starts at 10 seconds, 8 seconds of hacking)
    const stage2 = setTimeout(() => {
      setStage(2);
      clearInterval(interval);
      clearInterval(popupInterval);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    }, 10000);

    // Stage 3: RAM Spike (starts at 14 seconds)
    const junkData: any[] = [];
    let leakInterval: NodeJS.Timeout;
    const stage3 = setTimeout(() => {
      setStage(3);
      let allocations = 0;
      leakInterval = setInterval(() => {
        try {
          if (allocations < 100) { 
            junkData.push(new Array(500000).fill("ENCRYPTED_DATA_" + Math.random()));
            allocations++;
          } else {
            clearInterval(leakInterval);
          }
        } catch (e) {
          clearInterval(leakInterval);
        }
      }, 50);
    }, 14000);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearInterval(interval);
      clearInterval(popupInterval);
      clearInterval(leakInterval);
      document.body.style.overflow = "";
    };
  }, [stage]);

  if (stage === 0) return null;

  if (stage === 1) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999999, backgroundColor: "black",
        color: "#00ff00", fontFamily: "monospace", overflow: "hidden", pointerEvents: "auto", cursor: "none",
        animation: "violentShake 0.1s infinite"
      }} onClick={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
        
        {/* Background Code */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.3, fontSize: "0.8rem", wordWrap: "break-word", lineHeight: "1.1" }}>
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>

        {/* Central dramatic message */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10, backgroundColor: "rgba(0,0,0,0.8)", padding: "40px", border: "5px solid red", boxShadow: "0 0 50px red", width: "90%", maxWidth: "800px" }}>
          <h1 style={{ color: "red", fontSize: "4rem", margin: "0 0 20px 0", animation: "blink 0.2s infinite", textShadow: "0 0 20px red" }}>
            ☠️ SYSTEM COMPROMISED ☠️
          </h1>
          <p style={{ fontSize: "2rem", color: "white" }}>
            DOWNLOADING MALWARE PAYLOAD...
          </p>
          <p style={{ fontSize: "1.5rem", color: "yellow", marginTop: "20px" }}>
            DO NOT TURN OFF YOUR COMPUTER
          </p>
          
          <div style={{ marginTop: "30px", borderTop: "2px solid red", paddingTop: "20px" }}>
            <p style={{ fontSize: "1.8rem", color: "#ff4444", fontWeight: "bold" }}>
              ⚠️ ROBANDO DATOS DEL DISPOSITIVO ⚠️
            </p>
            <p style={{ fontSize: "1.2rem", color: "white", marginTop: "10px" }}>
              Extrayendo información bancaria y contraseñas de TODOS LOS JUGADORES (Izan, Dani, Pablo, Diego, Javier, Carlos, Mario, Alejandro...)
            </p>
          </div>
        </div>

        {/* Floating popups */}
        {popups.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            backgroundColor: p.color, color: "white", padding: "15px 30px",
            border: "2px solid red", fontSize: "1.5rem", fontWeight: "bold",
            boxShadow: "5px 5px 0 rgba(255,0,0,0.5)", zIndex: 5,
            animation: "shake 0.5s infinite"
          }}>
            {p.text}
          </div>
        ))}

        <style>{`
          @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
          @keyframes shake { 
            0% { transform: translate(1px, 1px) rotate(0deg); } 
            25% { transform: translate(-1px, -2px) rotate(-1deg); } 
            50% { transform: translate(-3px, 0px) rotate(1deg); } 
            75% { transform: translate(3px, 2px) rotate(0deg); } 
            100% { transform: translate(1px, -1px) rotate(-1deg); } 
          }
          @keyframes violentShake {
            0% { transform: translate(2px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(0px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(2px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(2px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
          }
        `}</style>
      </div>
    );
  }

  // Stage >= 2: BSOD
  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, zIndex: 9999999, backgroundColor: "#0078D7", color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: "10%",
        display: "flex", flexDirection: "column", pointerEvents: "auto", cursor: "none"
      }}
      onClick={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}
    >
      <h1 style={{ fontSize: "10rem", margin: "0 0 20px 0", fontWeight: "normal" }}>:(</h1>
      <p style={{ fontSize: "2.5rem", marginBottom: "40px", lineHeight: "1.4" }}>
        Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" }}>
        <p style={{ fontSize: "2rem" }}><span style={{ fontWeight: "bold" }}>0%</span> complete</p>
      </div>
      <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
        <div style={{ width: "120px", height: "120px", background: "white", padding: "10px", flexShrink: 0 }}>
          <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: "2px" }}>
             {Array.from({length: 36}).map((_, i) => (
                <div key={i} style={{ background: Math.random() > 0.4 ? "black" : "white" }} />
             ))}
          </div>
        </div>
        <div style={{ fontSize: "1.2rem", display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px" }}>
          <p style={{ margin: 0 }}>For more information about this issue and possible fixes, visit https://www.windows.com/stopcode</p>
          <p style={{ margin: 0 }}>If you call a support person, give them this info:</p>
          <p style={{ margin: 0 }}>Stop code: CRITICAL_PROCESS_DIED</p>
        </div>
      </div>
    </div>
  );
}
