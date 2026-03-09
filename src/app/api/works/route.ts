import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type WorkRow = {
  id: string;
  type: "movie" | "series";
  title: string;
  year: number | null;
  poster_url: string | null;
  genres: string[];
  platforms: string[];
};

export async function GET() {
  try {
    const { rows } = await pool.query<WorkRow>(
      `
      SELECT
        w.id,
        w.type,
        w.title,
        w.year,
        w.poster_url,
        COALESCE(
          ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),
          '{}'
        ) AS genres,
        COALESCE(
          ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
          '{}'
        ) AS platforms
      FROM works w
      LEFT JOIN work_genres wg ON wg.work_id = w.id
      LEFT JOIN genres g ON g.id = wg.genre_id
      LEFT JOIN work_platforms wp ON wp.work_id = w.id
      LEFT JOIN platforms p ON p.id = wp.platform_id
      GROUP BY w.id
      ORDER BY w.year DESC NULLS LAST;
      `
    );

    return NextResponse.json({
      ok: true,
      data: rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
