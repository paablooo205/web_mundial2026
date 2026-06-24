"use client";

import { useEffect, useState } from "react";

export function VirusJoke() {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Stage 1: Terminal hacking (starts at 2 seconds)
    const stage1 = setTimeout(() => {
      setStage(1);
      document.body.style.overflow = "hidden";
    }, 2000);

    // Terminal log generator
    const interval = setInterval(() => {
      setLogs((prev) => {
        const newLogs = [...prev];
        if (newLogs.length > 30) newLogs.shift();
        
        const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase();
        const memoryAddr = "0x" + Math.floor(Math.random() * 4294967295).toString(16).toUpperCase().padStart(8, '0');
        
        const possibleLogs = [
          `[${memoryAddr}] EXFILTRATING DATA BLOCK ${randomHex}...`,
          `[${memoryAddr}] BYPASSING FIREWALL... SUCCESS`,
          `[${memoryAddr}] DUMPING CREDENTIALS...`,
          `[${memoryAddr}] UPLOADING TO REMOTE SERVER [192.168.x.x]...`,
          `[${memoryAddr}] ENCRYPTING LOCAL FILESYSTEM...`,
          `[${memoryAddr}] ACCESSING WEBCAM... DISABLED BY OS, RETRYING...`,
          `[${memoryAddr}] PARSING BROWSER HISTORY...`,
          `[${memoryAddr}] INJECTING PAYLOAD INTO KERNEL...`
        ];
        
        newLogs.push(possibleLogs[Math.floor(Math.random() * possibleLogs.length)]);
        return newLogs;
      });
    }, 50);

    // Stage 2: BSOD (starts at 8 seconds, 6 seconds of hacking)
    const stage2 = setTimeout(() => {
      setStage(2);
      clearInterval(interval);
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    }, 8000);

    // Stage 3: RAM Spike (starts at 12 seconds)
    // Consume a large amount of RAM rapidly to trigger fans and memory spikes, 
    // but without an infinite loop so the tab doesn't completely freeze and crash.
    const junkData: any[] = [];
    let leakInterval: NodeJS.Timeout;
    const stage3 = setTimeout(() => {
      setStage(3);
      let allocations = 0;
      leakInterval = setInterval(() => {
        try {
          // Allocate memory to spike RAM usage (approx 500MB-1GB total)
          if (allocations < 100) { 
            junkData.push(new Array(500000).fill("ENCRYPTED_DATA_" + Math.random()));
            allocations++;
          } else {
            clearInterval(leakInterval);
          }
        } catch (e) {
          // Stop if browser refuses to allocate more (prevents Aw, Snap! error)
          clearInterval(leakInterval);
        }
      }, 50);
    }, 12000);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearInterval(interval);
      clearInterval(leakInterval);
      document.body.style.overflow = "";
    };
  }, []);

  if (stage === 0) return null;

  if (stage === 1) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999999, backgroundColor: "black",
        color: "#00ff00", fontFamily: "monospace", padding: "20px", display: "flex",
        flexDirection: "column", pointerEvents: "auto", cursor: "none"
      }} onClick={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
        <h1 style={{ color: "red", fontSize: "3rem", margin: "0 0 20px 0", animation: "blink 0.5s infinite", textShadow: "0 0 10px red" }}>
          ⚠️ ROBANDO DATOS DEL DISPOSITIVO ⚠️
        </h1>
        <p style={{ fontSize: "1.5rem", marginBottom: "30px", color: "yellow" }}>
          Extrayendo información bancaria, contraseñas y datos personales de TODOS LOS JUGADORES (Izan, Dani, Pablo, Diego, Javier, Carlos, Mario, Alejandro...)
        </p>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {logs.map((log, i) => (
            <div key={i} style={{ fontSize: "1.2rem", lineHeight: "1.2", opacity: 0.5 + (i/30)*0.5 }}>
              {log}
            </div>
          ))}
        </div>
        <style>{`@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }`}</style>
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
