"use client";

import { useEffect, useState } from "react";

const TARGET_DATE = new Date("2026-06-11T00:00:00Z").getTime();

export function KickoffModal() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("worldcup_started_seen") === "true") {
      return;
    }

    function checkKickoff() {
      const now = new Date().getTime();
      if (now >= TARGET_DATE) {
        setShowModal(true);
      }
    }

    // Initial check
    checkKickoff();

    // If not started yet, poll every second
    const interval = setInterval(() => {
      if (!showModal && localStorage.getItem("worldcup_started_seen") !== "true") {
        checkKickoff();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showModal]);

  if (!showModal) return null;

  const handleClose = () => {
    localStorage.setItem("worldcup_started_seen", "true");
    setShowModal(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content kickoff-card">
        <div className="kickoff-icon">⚽</div>
        <h2>¡El Mundial ha comenzado!</h2>
        <p>
          La espera ha terminado. La Copa del Mundo USA 2026 acaba de arrancar. 
          ¡Disfruta del mejor fútbol y suerte con tu porra!
        </p>
        <button type="button" className="button primary" onClick={handleClose}>
          ¡A por todas!
        </button>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.4s ease-out forwards;
        }

        .kickoff-card {
          background: linear-gradient(145deg, var(--bg-elevated), #1a2235);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 40px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          transform: scale(0.9);
          animation: popUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .kickoff-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: bounce 2s infinite;
        }

        h2 {
          color: var(--usa-white);
          margin-bottom: 12px;
          font-size: 1.5rem;
          font-weight: 700;
        }

        p {
          color: var(--silver);
          margin-bottom: 24px;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        button {
          width: 100%;
          font-size: 1rem;
          padding: 12px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-15px); }
          60% { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  );
}
