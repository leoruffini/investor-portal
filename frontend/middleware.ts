import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

function verifySession(token: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expected = crypto
    .createHmac("sha256", adminPassword)
    .update("admin_session")
    .digest("hex");
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes, skip /admin/login and /admin/api/auth
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/api/auth")
  ) {
    const token = request.cookies.get("admin_session")?.value;
    if (!token || !verifySession(token)) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
