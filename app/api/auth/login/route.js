import { NextResponse } from "next/server";
import { createSessionToken } from "../../../../lib/auth";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const password = body && typeof body.password === "string" ? body.password : "";

  const expected = process.env.BOARD_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!expected || !secret) {
    return NextResponse.json(
      { error: "server_not_configured", message: "BOARD_PASSWORD ou AUTH_SECRET não configurados no projeto." },
      { status: 500 }
    );
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("glaz_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
