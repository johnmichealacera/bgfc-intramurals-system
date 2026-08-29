import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const statusSchema = z.object({
  status: z.enum(["UPCOMING", "ONGOING", "CANCELLED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const { status } = statusSchema.parse(await req.json());

    const current = await db.sportEvent.findUniqueOrThrow({ where: { id } });
    if (current.status === "COMPLETED") {
      return NextResponse.json({ error: "Completed events cannot change status here." }, { status: 409 });
    }

    const event = await db.sportEvent.update({ where: { id }, data: { status } });
    return NextResponse.json(event);
  } catch (error) {
    return apiError(error);
  }
}
