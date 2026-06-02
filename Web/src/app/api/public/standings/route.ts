import { NextResponse } from "next/server";
import { getPublicStandings } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await getPublicStandings());
}
