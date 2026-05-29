"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterCodePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Por favor, introduce tu código de acceso.");
      return;
    }
    router.push(`/predicciones/${cleanCode}`);
  }

  return (
    <main className="page" style={{ maxWidth: "480px", marginTop: "40px" }}>
      <div className="panel" style={{ padding: "32px", display: "grid", gap: "24px" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Tus Apuestas</h1>
          <p className="muted" style={{ fontSize: "14px", margin: 0 }}>
            Introduce tu código privado de jugador para ver y rellenar tu porra.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>
              Código de Acceso
            </label>
            <input
              aria-label="Código de acceso de jugador"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="Ej: JUGADOR1"
              style={{ textAlign: "center", letterSpacing: "0.1em", fontWeight: "700" }}
            />
            {error && (
              <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>
                {error}
              </p>
            )}
          </div>

          <button className="button primary" type="submit" style={{ width: "100%" }}>
            Acceder al Formulario
          </button>
        </form>

        <div style={{ textAlign: "center", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
            ¿No tienes tu código? Consúltalo con el administrador.
          </p>
        </div>
      </div>
    </main>
  );
}
