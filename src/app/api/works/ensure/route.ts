import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const source = String(body.source ?? "tmdb");
    const workType = String(body.workType ?? body.work_type ?? "movie"); // "movie" | "tv"
    const sourceId = String(body.sourceId ?? body.source_id ?? "");
    const title = String(body.title ?? "");
    const year =
      body.year === null || body.year === undefined ? null : Number(body.year);
    const posterPath =
      body.posterPath === null || body.posterPath === undefined
        ? null
        : String(body.posterPath);

    if (!sourceId || !title) {
      return NextResponse.json(
        { ok: false, error: "Missing sourceId or title" },
        { status: 400 }
      );
    }

    // works.type en tu proyecto es "movie" | "series"
    const type = workType === "tv" ? "series" : "movie";
    const posterUrl = posterPath ? `${TMDB_IMG}${posterPath}` : null;

    const { rows } = await pool.query<{ id: string }>(
      `
      INSERT INTO works (id, type, title, year, poster_url, source, work_type, source_id)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (source, work_type, source_id)
      WHERE source IS NOT NULL AND work_type IS NOT NULL AND source_id IS NOT NULL
      DO UPDATE SET
        type = EXCLUDED.type,
        title = EXCLUDED.title,
        year = EXCLUDED.year,
        poster_url = EXCLUDED.poster_url
      RETURNING id;
      `,
      [type, title, year, posterUrl, source, workType, sourceId]
    );

    return NextResponse.json({ ok: true, workId: rows[0].id });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}