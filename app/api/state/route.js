import { NextResponse } from "next/server";
import { getState, setState } from "../../../lib/db";
import { defaultState } from "../../../lib/defaultState";

export async function GET() {
  try {
    const stored = await getState();
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
    await setState(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "storage_unavailable", message: String((err && err.message) || err) },
      { status: 500 }
    );
  }
}
