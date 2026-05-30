import { createServiceClient } from "@/lib/supabase";
import { ResultadosClient } from "./resultados-client";

export const dynamic = "force-dynamic";

export default async function ResultadosPage() {
  const supabase = createServiceClient();

  const [
    { data: matches },
    { data: teams },
    { data: results },
    { data: awards }
  ] = await Promise.all([
    supabase
      .from("match_cards")
      .select("*")
      .order("kickoff_at", { ascending: true, nullsFirst: false }),
    supabase.from("teams").select("id, canonical_name, group_code").order("canonical_name"),
    supabase.from("match_results").select("*"),
    supabase.from("tournament_awards").select("*").eq("id", 1).maybeSingle()
  ]);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Resultados Reales</h1>
          <p className="muted">Consulta los marcadores oficiales y la clasificación oficial del Mundial 2026.</p>
        </div>
        <span className="status-pill">Oficial</span>
      </div>

      <ResultadosClient
        matches={matches ?? []}
        teams={teams ?? []}
        results={results ?? []}
        awards={awards ?? null}
      />
    </main>
  );
}
