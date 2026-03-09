import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type WorkDetailRow = {
  id: string;
  type: "movie" | "series";
  title: string;
  year: number | null;
  poster_url: string | null;
  genres: string[];
  platforms: string[];
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Si no es UUID, devolvemos 400 (así no confunde con "not found")
    if (!isUuid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id (must be UUID)" },
        { status: 400 }
      );
    }

    const { rows } = await pool.query<WorkDetailRow>(
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
      WHERE w.id = $1::uuid
      GROUP BY w.id
      LIMIT 1;
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Work not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}