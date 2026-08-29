import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const assignSchema = z.object({
  userId: z.string().min(1),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const tabulators = await db.eventTabulator.findMany({
      where: { sportEventId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(tabulators);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const { userId } = assignSchema.parse(await req.json());

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== "TABULATOR") {
      return NextResponse.json({ error: "Only TABULATOR accounts can be assigned to events." }, { status: 400 });
    }

    const assignment = await db.eventTabulator.create({
      data: { sportEventId: id, userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
