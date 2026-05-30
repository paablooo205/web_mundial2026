"use client";

import { useState, useMemo } from "react";

type PlayerAvatarProps = {
  name: string;
};

export function PlayerAvatar({ name }: PlayerAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);

  // Obtener iniciales (máximo 2 letras)
  const words = name.trim().split(/\s+/);
  const initials = words.length > 1 
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].substring(0, 2).toUpperCase();

  // Construir candidatos de URL dinámicamente para soportar mayúsculas y múltiples formatos
  const urls = useMemo(() => {
    const exactName = name.trim().replace(/\s+/g, "_");
    const normalizedName = name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/\s+/g, "_");

    const bases = exactName === normalizedName ? [exactName] : [exactName, normalizedName];
    const formats = [".webp", ".jpg", ".jpeg", ".png"];

    const list: string[] = [];
    // Prioridad 1: buscar primero .webp (caso exacto y luego minúsculas)
    bases.forEach(base => list.push(`/jugadores/${base}.webp`));
    // Prioridad 2: buscar el resto de extensiones
    formats.forEach(ext => {
      if (ext !== ".webp") {
        bases.forEach(base => list.push(`/jugadores/${base}${ext}`));
      }
    });

    return list;
  }, [name]);

  const handleImageError = () => {
    if (candidateIndex < urls.length - 1) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setError(true);
    }
  };

  return (
    <div 
      className="player-avatar-container"
      style={{
        position: "relative",
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        overflow: "hidden",
        border: "1px solid var(--line)",
        backgroundColor: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
      }}
    >
      {/* Fallback de Iniciales con gradiente premium */}
      {(!loaded || error) && (
        <div 
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg) 100%)",
            color: "var(--usa-red-bright)",
            fontWeight: "700",
            fontSize: "0.85rem",
            letterSpacing: "0.5px"
          }}
        >
          {initials}
        </div>
      )}

      {/* Imagen real del jugador */}
      {!error && (
        <img 
          src={urls[candidateIndex]} 
          alt={`Foto de ${name}`}
          onLoad={() => setLoaded(true)}
          onError={handleImageError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.25s ease-in-out"
          }}
        />
      )}
    </div>
  );
}


