"use client";

import { useEffect, useState } from "react";

export function TxufoModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verificar si ya se ha mostrado el mensaje
    const hasSeenModal = localStorage.getItem("hasSeenTxufoPopup");
    if (!hasSeenModal) {
      // Pequeño retraso para que la animación se vea suave al entrar
      const timer = setTimeout(() => setIsOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenTxufoPopup", "true");
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content info-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>
          
          <div className="rules-content" style={{ padding: "20px 0" }}>
            <h2 style={{ fontSize: "1.5rem", color: "var(--usa-white)", marginBottom: "16px" }}>
              ¡Atención!
            </h2>
            <p style={{ fontSize: "1.2rem", color: "var(--usa-red-bright)", fontWeight: "bold" }}>
              Txufo,  jódete que malo eres
            </p>
          </div>
          
          <button 
            className="button" 
            onClick={handleClose}
            style={{ marginTop: "20px", padding: "10px 20px", fontSize: "1rem" }}
          >
            Aceptar
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out forwards;
        }

        .info-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .close-button {
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
        }

        .close-button:hover {
          color: var(--usa-white);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
