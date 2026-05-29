import { getPublicStandings } from "@/lib/queries";

export const revalidate = 30;

export default async function ClasificacionPage() {
  const standings = await getPublicStandings();

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Clasificación</h1>
          <p className="muted">Actualizada automáticamente cuando entren nuevos resultados.</p>
        </div>
        <span className="status-pill">Pública</span>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jugador</th>
              <th>Puntos</th>
              <th>Exactos</th>
              <th>Signos</th>
              <th>Campeon</th>
              <th>Goleador</th>
              <th>Balon de oro</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <tr key={row.player_id}>
                <td>
                  <span className={`rank ${index < 3 ? 'rank-' + (index + 1) : ''}`}>
                    {row.position ?? index + 1}
                  </span>
                </td>
                <td>{row.display_name}</td>
                <td>{row.total_points}</td>
                <td>{row.exact_scores}</td>
                <td>{row.correct_signs}</td>
                <td>{row.champion_hit ? "Sí" : "-"}</td>
                <td>{row.top_scorer_hit ? "Sí" : "-"}</td>
                <td>{row.golden_ball_hit ? "Sí" : "-"}</td>
              </tr>
            ))}
            {standings.length === 0 ? (
              <tr>
                <td colSpan={8}>Todavia no hay jugadores cargados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
