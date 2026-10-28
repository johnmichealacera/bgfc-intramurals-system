import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const seasons = await db.season.findMany({ orderBy: { startDate: "desc" } });
    return NextResponse.json(seasons);
  } catch (error) {
    return apiError(error);
  }
}
