"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterCodePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError("Por favor, introduce tu código de acceso.");
      return;
    }
    router.push(`/predicciones/${encodeURIComponent(cleanCode)}`);
  }

  return (
    <main className="page page--narrow">
      <div className="panel auth-panel">
        <div className="auth-panel__head">
          <h1>Tus apuestas</h1>
          <p className="muted" style={{ fontSize: "0.875rem", margin: 0 }}>
            Introduce tu código privado para ver y rellenar tu porra.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <div>
            <label className="form-label" htmlFor="access-code">
              Código de acceso
            </label>
            <input
              id="access-code"
              aria-label="Código de acceso de jugador"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="juanmizo_marcaico"
              className="input--code"
              autoComplete="off"
              spellCheck={false}
            />
            {error && <p className="form-error">{error}</p>}
          </div>

          <button className="button primary" type="submit" style={{ width: "100%" }}>
            Entrar
          </button>
        </form>

        <div className="auth-panel__foot">
          <p className="muted">¿No tienes código? Pide uno al administrador.</p>
        </div>
      </div>
    </main>
  );
}
