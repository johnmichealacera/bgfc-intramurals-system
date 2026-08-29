import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isPathAllowedForRole } from "@/lib/nav";
import type { AppRole } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as AppRole | undefined;
  if (!role || !isPathAllowedForRole(req.nextUrl.pathname, role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/seasons/:path*",
    "/teams/:path*",
    "/events/:path*",
    "/sports/:path*",
    "/matches/:path*",
    "/points-rules/:path*",
    "/users/:path*",
  ],
};
