import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const season = await db.season.findFirst({ where: { isActive: true } });
    return NextResponse.json(season);
  } catch (error) {
    return apiError(error);
  }
}
