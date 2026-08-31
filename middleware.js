import { NextResponse } from "next/server";
import { verifySessionToken } from "./lib/auth";

export const config = {
  matcher: ["/board/:path*", "/api/state/:path*"],
};

export async function middleware(req) {
  const token = req.cookies.get("glaz_session")?.value;
  const secret = process.env.AUTH_SECRET;
  const valid = await verifySessionToken(token, secret);

  if (valid) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}
