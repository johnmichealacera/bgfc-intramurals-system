import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { hash } from "bcryptjs";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "TABULATOR"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const { password, ...rest } = body;

    const user = await db.user.update({
      where: { id },
      data: { ...rest, ...(password ? { password: await hash(password, 12) } : {}) },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiError(error);
  }
}
