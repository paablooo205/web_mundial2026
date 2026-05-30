import { NextResponse } from "next/server";
import { savePredictionsFromForm } from "@/lib/predictions";
import { recalculateStandings } from "@/lib/standings";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await savePredictionsFromForm(form);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recalculateStandings();

  return NextResponse.json({ ok: true });
}
