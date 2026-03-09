import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Status = "favorite" | "watchlist" | "watched";

// MODO DEMO (luego lo cambiaremos por Clerk)
const DEMO_USER_ID = "user_test_1";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function normalizeStatus(s: string): Status | null {
  const v = (s ?? "").trim();
  if (v === "favorite" || v === "watchlist" || v === "watched") return v;
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const workId = (searchParams.get("workId") ?? "").trim();
    const status = normalizeStatus(searchParams.get("status") ?? "favorite");

    if (!workId) {
      return NextResponse.json({ ok: false, error: "Missing workId" }, { status: 400 });
    }
    if (!isUuid(workId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid workId (must be UUID)" },
        { status: 400 }
      );
    }
    if (!status) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `
      SELECT 1
      FROM user_works
      WHERE user_id = $1
        AND work_id = $2::uuid
        AND status = $3
      LIMIT 1
      `,
      [DEMO_USER_ID, workId, status]
    );

    return NextResponse.json({ ok: true, isFavorite: rows.length > 0 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const workId = String(body?.workId ?? "").trim();
    const status = normalizeStatus(String(body?.status ?? "favorite"));

    if (!workId) {
      return NextResponse.json({ ok: false, error: "Missing workId" }, { status: 400 });
    }
    if (!isUuid(workId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid workId (must be UUID)" },
        { status: 400 }
      );
    }
    if (!status) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const { rows: existsRows } = await pool.query(
      `
      SELECT 1
      FROM user_works
      WHERE user_id = $1
        AND work_id = $2::uuid
        AND status = $3
      LIMIT 1
      `,
      [DEMO_USER_ID, workId, status]
    );

    const exists = existsRows.length > 0;

    if (exists) {
      await pool.query(
        `
        DELETE FROM user_works
        WHERE user_id = $1
          AND work_id = $2::uuid
          AND status = $3
        `,
        [DEMO_USER_ID, workId, status]
      );

      return NextResponse.json({ ok: true, isFavorite: false });
    }

    await pool.query(
      `
      INSERT INTO user_works (user_id, work_id, status)
      VALUES ($1, $2::uuid, $3)
      ON CONFLICT (user_id, work_id, status) DO NOTHING
      `,
      [DEMO_USER_ID, workId, status]
    );

    return NextResponse.json({ ok: true, isFavorite: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}