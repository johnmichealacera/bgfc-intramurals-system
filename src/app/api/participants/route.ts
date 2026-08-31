import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const participantSchema = z.object({
  seasonId: z.string().min(1),
  teamId: z.string().nullable().optional(),
  fullName: z.string().min(1),
  course: z.string().min(1),
  yearLevel: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }

    const participants = await db.participant.findMany({
      where: { seasonId },
      include: { team: { select: { id: true, name: true, colorHex: true } } },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(participants);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = participantSchema.parse(await req.json());
    const participant = await db.participant.create({
      data: { ...body, teamId: body.teamId ?? null },
      include: { team: { select: { id: true, name: true, colorHex: true } } },
    });
    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
