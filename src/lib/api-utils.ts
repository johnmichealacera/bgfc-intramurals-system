import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { TabulatorConflictError } from "@/lib/tabulator";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input", issues: error.flatten() }, { status: 400 });
  }

  if (error instanceof TabulatorConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  if (error instanceof Error && error.message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return NextResponse.json(
        { error: "This record is referenced by other data and cannot be deleted or changed." },
        { status: 409 },
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A record with these values already exists." }, { status: 409 });
    }
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
