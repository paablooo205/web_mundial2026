import { NextResponse } from "next/server";
import { recalculateStandings } from "@/lib/standings";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "recalculate_standings") {
      await recalculateStandings();
      revalidatePath("/clasificacion");
      revalidatePath("/admin");
      return NextResponse.json({ success: true, message: "Clasificación recalculada con éxito." });
    }

    if (action === "clear_cache") {
      // Revalidate main routes to ensure they fetch fresh data
      revalidatePath("/", "layout");
      return NextResponse.json({ success: true, message: "Caché global limpiada con éxito." });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });

  } catch (err: any) {
    console.error("Maintenance Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
