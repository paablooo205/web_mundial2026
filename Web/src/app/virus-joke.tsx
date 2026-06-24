"use client";

import { useEffect, useState } from "react";

export function VirusJoke() {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    // Escalate stage over time
    const stage1 = setTimeout(() => setStage(1), 2000);
    const stage2 = setTimeout(() => setStage(2), 5000);
    const stage3 = setTimeout(() => setStage(3), 8000);

    // Glitch effect
    const glitchInterval = setInterval(() => {
      setGlitch(g => !g);
    }, 150);

    // Terminal logs
    let logCount = 0;
    const logMessages = [
      "CRITICAL: Unauthorized access detected",
      "Bypassing firewall...",
      "Firewall breached. Root access granted.",
      "Downloading payload: ransomware_v4.2.exe ... 100%",
      "Executing payload...",
      "Encrypting filesystem: C:\\Users\\... DONE",
      "Encrypting database...",
      "Wiping backups... DONE",
      "Uploading private data to remote server...",
      "System integrity compromised."
    ];

    const logInterval = setInterval(() => {
      if (logCount < logMessages.length) {
        setLogs(prev => [...prev, logMessages[logCount]]);
        logCount++;
      } else {
        setLogs(prev => [...prev, `Encrypting block 0x${Math.floor(Math.random()*1000000).toString(16).toUpperCase()}...`]);
      }
    }, 400);

    // Freeze the browser tab entirely at stage 4 (after 12 seconds)
    const stage4 = setTimeout(() => {
      setStage(4);
      setTimeout(() => {
        // This will completely freeze the tab, making it unresponsive
        while(true) {
          history.pushState(null, "", window.location.href);
        }
      }, 500);
    }, 12000);

    // Nasty alerts
    const alertInterval = setInterval(() => {
      if (stage >= 2 && stage < 4) {
        try {
          window.alert("⚠️ SYSTEM FAILURE ⚠️\nALL YOUR FILES ARE BEING ENCRYPTED.\nDO NOT TURN OFF YOUR COMPUTER.");
        } catch (e) {}
      }
    }, 1500);

    // Block scrolling and exiting
    document.body.style.overflow = "hidden";
    
    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearTimeout(stage4);
      clearInterval(glitchInterval);
      clearInterval(logInterval);
      clearInterval(alertInterval);
      document.body.style.overflow = "";
    };
  }, [stage]);

  if (stage === 0) return null;

  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 9999999, 
        backgroundColor: stage >= 2 ? (glitch ? "#ff0000" : "#000000") : "rgba(0,0,0,0.85)",
        color: "#00ff00",
        fontFamily: "'Courier New', Courier, monospace",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        cursor: "none"
      }}
      onClick={(e) => {
        e.preventDefault();
        try { window.alert("ACCESS DENIED"); } catch(e){}
      }}
    >
      <div style={{ flex: 1, overflow: "hidden" }}>
        {stage >= 1 && (
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "red", textAlign: "center", marginBottom: "30px", textShadow: "0 0 10px red", textTransform: "uppercase", letterSpacing: "5px" }}>
            {glitch ? "⚠️ SYSTEM CORRUPTED ⚠️" : "FATAL EXCEPTION ERROR 0x0000007B"}
          </div>
        )}
        
        {stage >= 1 && logs.map((log, i) => (
          <div key={i} style={{ fontSize: "1.2rem", marginBottom: "8px" }}>
            {`> ${log}`}
          </div>
        ))}
        
        {stage >= 3 && (
          <div style={{ 
            position: "absolute", 
            top: "50%", 
            left: "50%", 
            transform: `translate(-50%, -50%) scale(${glitch ? 1.05 : 1})`,
            backgroundColor: "black",
            border: "8px solid red",
            padding: "40px",
            textAlign: "center",
            boxShadow: "0 0 100px red",
            width: "80%",
            maxWidth: "800px"
          }}>
            <h1 style={{ color: "red", fontSize: "4rem", margin: "0 0 20px 0" }}>☠️ HACKED ☠️</h1>
            <p style={{ color: "white", fontSize: "1.5rem" }}>
              YOUR DEVICE HAS BEEN COMPROMISED. ALL DATA IS BEING ENCRYPTED AND SENT TO A REMOTE SERVER.
            </p>
            <p style={{ color: "yellow", fontSize: "2rem", fontWeight: "bold", animation: "blink 0.5s infinite" }}>
              CLOSING THIS WINDOW WILL RESULT IN PERMANENT DATA LOSS.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
