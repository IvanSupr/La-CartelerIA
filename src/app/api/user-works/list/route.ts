import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Status = "favorite" | "watchlist" | "watched";

// MODO DEMO (igual que tu /api/user-works)
const DEMO_USER_ID = "user_test_1";

function normalizeStatus(s: string | null): Status | "all" {
  const v = (s ?? "").trim();
  if (v === "favorite" || v === "watchlist" || v === "watched") return v;
  return "all";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = normalizeStatus(searchParams.get("status"));

    const params: any[] = [DEMO_USER_ID];
    let whereStatus = "";

    if (status !== "all") {
      params.push(status);
      whereStatus = `AND uw.status = $2`;
    }

    const { rows } = await pool.query(
      `
      SELECT
        uw.status,
        w.id AS work_id,
        w.type,
        w.title,
        w.year,
        w.poster_url,
        w.source,
        w.work_type,
        w.source_id
      FROM user_works uw
      JOIN works w ON w.id = uw.work_id
      WHERE uw.user_id = $1
      ${whereStatus}
      ORDER BY uw.created_at DESC
      `,
      params
    );

    return NextResponse.json({ ok: true, data: rows });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}