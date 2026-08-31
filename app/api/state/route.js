import { NextResponse } from "next/server";
import { getRedis } from "../../../lib/redis";
import { defaultState } from "../../../lib/defaultState";

const KEY = "glaz:state";

export async function GET() {
  try {
    const redis = getRedis();
    const stored = await redis.get(KEY);
    return NextResponse.json(stored || defaultState());
  } catch (err) {
    return NextResponse.json(
      { error: "storage_unavailable", message: String((err && err.message) || err) },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.tasks) || !Array.isArray(body.activity)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    await redis.set(KEY, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "storage_unavailable", message: String((err && err.message) || err) },
      { status: 500 }
    );
  }
}
