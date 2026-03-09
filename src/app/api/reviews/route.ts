import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEMO_USER_ID = "user_test_1";

type ReviewRow = {
  id: string;
  work_id: string;
  user_id: string;
  username: string;
  rating: number;
  content: string;
  is_public: boolean;
  created_at: string;
  upvotes: string | number;
  downvotes: string | number;
  user_vote: number | null;
};

export async function GET(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "Missing DATABASE_URL in .env.local" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");

    if (!workId) {
      return NextResponse.json(
        { ok: false, error: "Missing workId" },
        { status: 400 }
      );
    }

    const result = await pool.query<ReviewRow>(
      `
      SELECT
        r.id,
        r.work_id,
        r.user_id,
        r.username,
        r.rating,
        r.content,
        r.is_public,
        r.created_at,
        COALESCE(SUM(CASE WHEN rv.vote = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN rv.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
        MAX(CASE WHEN rv.user_id = $2 THEN rv.vote ELSE NULL END) AS user_vote
      FROM reviews r
      LEFT JOIN review_votes rv ON rv.review_id = r.id
      WHERE r.work_id = $1 AND r.is_public = TRUE
      GROUP BY
        r.id, r.work_id, r.user_id, r.username, r.rating, r.content, r.is_public, r.created_at
      ORDER BY r.created_at DESC
      `,
      [workId, DEMO_USER_ID]
    );

    return NextResponse.json({
      ok: true,
      reviews: result.rows.map((row) => ({
        id: row.id,
        workId: row.work_id,
        userId: row.user_id,
        author: row.username,
        rating: Number(row.rating),
        content: row.content,
        isPublic: row.is_public,
        date: row.created_at,
        upvotes: Number(row.upvotes ?? 0),
        downvotes: Number(row.downvotes ?? 0),
        isUserReview: row.user_id === DEMO_USER_ID,
        userVote: row.user_vote === 1 ? 1 : row.user_vote === -1 ? -1 : 0,
      })),
    });
  } catch (e: any) {
    console.error("GET /api/reviews error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "Missing DATABASE_URL in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    const workId = String(body?.workId ?? "").trim();
    const username = String(body?.username ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const rating = Number(body?.rating ?? 0);

    if (!workId) {
      return NextResponse.json(
        { ok: false, error: "Missing workId" },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { ok: false, error: "Missing username" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
      return NextResponse.json(
        { ok: false, error: "Invalid rating" },
        { status: 400 }
      );
    }

    if (content.length < 20) {
      return NextResponse.json(
        { ok: false, error: "Review too short" },
        { status: 400 }
      );
    }

    const existing = await pool.query<{ id: string }>(
      `
      SELECT id
      FROM reviews
      WHERE work_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [workId, DEMO_USER_ID]
    );

    let row:
      | {
          id: string;
          work_id: string;
          user_id: string;
          username: string;
          rating: number;
          content: string;
          is_public: boolean;
          created_at: string;
        }
      | undefined;

    if (existing.rowCount && existing.rows[0]) {
      const updated = await pool.query(
        `
        UPDATE reviews
        SET
          username = $3,
          rating = $4,
          content = $5,
          is_public = TRUE
        WHERE work_id = $1 AND user_id = $2
        RETURNING
          id,
          work_id,
          user_id,
          username,
          rating,
          content,
          is_public,
          created_at
        `,
        [workId, DEMO_USER_ID, username, rating, content]
      );

      row = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `
        INSERT INTO reviews (
          work_id,
          user_id,
          username,
          rating,
          content,
          is_public
        )
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING
          id,
          work_id,
          user_id,
          username,
          rating,
          content,
          is_public,
          created_at
        `,
        [workId, DEMO_USER_ID, username, rating, content]
      );

      row = inserted.rows[0];
    }

    return NextResponse.json({
      ok: true,
      review: {
        id: row!.id,
        workId: row!.work_id,
        userId: row!.user_id,
        author: row!.username,
        rating: Number(row!.rating),
        content: row!.content,
        isPublic: row!.is_public,
        date: row!.created_at,
        upvotes: 0,
        downvotes: 0,
        isUserReview: true,
        userVote: 0,
      },
    });
  } catch (e: any) {
    console.error("POST /api/reviews error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}