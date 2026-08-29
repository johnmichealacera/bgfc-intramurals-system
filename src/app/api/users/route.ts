import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { hash } from "bcryptjs";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "TABULATOR"]),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = userSchema.parse(await req.json());
    const password = await hash(body.password, 12);
    const user = await db.user.create({
      data: { name: body.name, email: body.email, password, role: body.role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
