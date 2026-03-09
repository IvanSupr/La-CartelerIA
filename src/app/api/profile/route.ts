import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Status = "favorite" | "watchlist" | "watched";
const DEMO_USER_ID = "user_test_1";

function isStatus(v: any): v is Status {
  return v === "favorite" || v === "watchlist" || v === "watched";
}

export async function GET() {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        uw.status,
        COUNT(*)::int AS count
      FROM user_works uw
      WHERE uw.user_id = $1
      GROUP BY uw.status
      `,
      [DEMO_USER_ID]
    );

    const counts: Record<Status, number> = {
      favorite: 0,
      watchlist: 0,
      watched: 0,
    };

    for (const r of rows as any[]) {
      const status = r.status;
      if (isStatus(status)) {
        counts[status] = Number(r.count) || 0;
      }
    }

    const { rows: recent } = await pool.query(
      `
      SELECT
        uw.status,
        w.id AS work_id,
        w.title,
        w.year,
        w.poster_url,
        w.source,
        w.work_type,
        w.source_id,
        uw.created_at
      FROM user_works uw
      JOIN works w ON w.id = uw.work_id
      WHERE uw.user_id = $1
      ORDER BY uw.created_at DESC
      LIMIT 6
      `,
      [DEMO_USER_ID]
    );

    return NextResponse.json({
      ok: true,
      user: { id: DEMO_USER_ID, name: "Demo User" },
      counts,
      recent,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}