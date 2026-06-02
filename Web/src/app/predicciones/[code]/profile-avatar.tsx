"use client";

import { useState } from "react";

export function ProfileAvatar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mini Avatar circular clickeable */}
      <div 
        onClick={() => setIsOpen(true)}
        className="avatar-trigger"
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid var(--usa-red-bright)",
          cursor: "pointer",
          transition: "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease",
          boxShadow: "0 0 10px rgba(220, 38, 38, 0.25)",
          flexShrink: 0
        }}
      >
        <img 
          src="/avatar.jpg" 
          alt="Perfil de jugador" 
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </div>

      {/* Modal Desplegable en el centro de la pantalla */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="avatar-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(7, 13, 26, 0.88)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.25s ease-out"
          }}
        >
          {/* Contenedor de la foto */}
          <div 
            onClick={(e) => e.stopPropagation()} // Evita cerrar si hacen clic en la foto
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
          >
            <img 
              src="/avatar.jpg" 
              alt="Foto de perfil de jugador ampliada" 
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                borderRadius: "var(--radius-lg)",
                border: "3px solid var(--usa-red-bright)",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(220, 38, 38, 0.35)",
                objectFit: "contain"
              }}
            />
            {/* Botón de cerrar elegante */}
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                marginTop: "16px",
                padding: "8px 24px",
                backgroundColor: "var(--usa-red-bright)",
                border: "1px solid var(--usa-red)",
                color: "#ffffff",
                borderRadius: "var(--radius-sm)",
                fontWeight: "600",
                fontSize: "0.875rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
                transition: "all 0.15s ease",
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--usa-red-bright)";
              }}
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

      {/* Animaciones CSS locales */}
      <style jsx global>{`
        .avatar-trigger:hover {
          transform: scale(1.1);
          box-shadow: 0 0 16px rgba(220, 38, 38, 0.5) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
