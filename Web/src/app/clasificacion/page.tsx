import { getPublicStandings } from "@/lib/queries";
import { PlayerAvatar } from "./player-avatar";
import { ScoringSystemModal } from "./scoring-system-modal";
import { TxufoModal } from "./txufo-modal";

export const dynamic = "force-dynamic";

function signHitsOnly(exactScores: number, correctSigns: number) {
  return Math.max(0, correctSigns - exactScores);
}

export default async function ClasificacionPage() {
  const standings = await getPublicStandings();

  return (
    <main className="page">
      <TxufoModal />
      <div className="page-header">
        <div>
          <h1>Clasificación</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.9375rem" }}>
            Actualizada cuando entran nuevos resultados.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ScoringSystemModal />
          <span className="status-pill">Pública</span>
        </div>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jugador</th>
              <th>Puntos</th>
              <th title="Marcador exacto (+5)">Exactos</th>
              <th title="1 / X / 2 acertado sin pleno (+2)">Signos</th>
              <th className="hide-mobile" title="Diferencia de goles sin pleno (+1)">Difs.</th>
              <th className="hide-mobile" title="Equipo que acertaste que avanza en cuartos, semifinales o final (+3)">Clasif.</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <tr key={row.player_id}>
                <td>
                  <span className={`rank ${index < 3 ? "rank-" + (index + 1) : ""}`}>
                    {row.position ?? index + 1}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <PlayerAvatar name={row.display_name} />
                    <span style={{ fontWeight: 500 }}>{row.display_name}</span>
                  </div>
                </td>
                <td>{row.total_points}</td>
                <td>{row.exact_scores}</td>
                <td>{signHitsOnly(row.exact_scores, row.correct_signs)}</td>
                <td className="hide-mobile">{row.goal_difference_hits ?? 0}</td>
                <td className="hide-mobile">{row.advancement_hits ?? 0}</td>
              </tr>
            ))}
            {standings.length === 0 ? (
              <tr>
                <td colSpan={7}>Todavia no hay jugadores cargados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="muted table-legend">
          Fase de grupos y dieciseisavos/octavos: exactos, signos y diferencias. Desde cuartos: además{" "}
          <strong>Clasif.</strong> (+3 si acertaste qué equipo avanza). El marcador solo puntúa si el cruce real
          coincide con tu cuadro (mismos dos equipos). Campeón, goleador y balón de oro suman al total sin mostrarse aquí.
        </p>
      </div>
    </main>
  );
}
