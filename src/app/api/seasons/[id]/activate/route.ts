import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const season = await db.$transaction(async (tx) => {
      await tx.season.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.season.update({ where: { id }, data: { isActive: true } });
    });
    return NextResponse.json(season);
  } catch (error) {
    return apiError(error);
  }
}
