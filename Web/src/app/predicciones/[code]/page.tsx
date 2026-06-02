import { notFound } from "next/navigation";
import { getPlayerEntryData } from "@/lib/queries";
import { PredictionForm } from "./prediction-form";
import { ProfileAvatar } from "./profile-avatar";

type PageProps = {
  params: Promise<{ code: string }>;
};

export const dynamic = "force-dynamic";

export default async function PredictionPage({ params }: PageProps) {
  const { code } = await params;
  const data = await getPlayerEntryData(code);

  if (!data.player) {
    notFound();
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Predicciones</h1>
          <p className="muted">Jugador: {data.player.display_name}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span className="status-pill">{data.locked ? "Bloqueado" : "Editable"}</span>
          <ProfileAvatar />
        </div>
      </div>
      <PredictionForm
        player={data.player}
        matches={data.matches}
        teams={data.teams}
        specialPrediction={data.specialPrediction}
        predictions={data.predictions}
        locked={data.locked}
      />
    </main>
  );
}
