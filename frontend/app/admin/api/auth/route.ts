import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/** Create an HMAC signature from the admin password so the cookie value can't be forged. */
function signSession(secret: string): string {
  return crypto.createHmac("sha256", secret).update("admin_session").digest("hex");
}

/** Verify a session token matches the expected HMAC. */
export function verifySession(token: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expected = signSession(adminPassword);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD no configurada en el servidor" },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 }
    );
  }

  const sessionToken = signSession(adminPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("admin_session");
  return response;
}
