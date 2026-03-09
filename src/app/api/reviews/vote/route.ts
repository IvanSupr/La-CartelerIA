import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEMO_USER_ID = "user_test_1";

type VoteSummaryRow = {
  upvotes: string | number;
  downvotes: string | number;
  user_vote: number | null;
};

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "Missing DATABASE_URL in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    const reviewId = String(body?.reviewId ?? "").trim();
    const vote = Number(body?.vote ?? 0);

    if (!reviewId) {
      return NextResponse.json(
        { ok: false, error: "Missing reviewId" },
        { status: 400 }
      );
    }

    if (![1, -1].includes(vote)) {
      return NextResponse.json(
        { ok: false, error: "Invalid vote" },
        { status: 400 }
      );
    }

    const existing = await pool.query<{ vote: number }>(
      `
      SELECT vote
      FROM review_votes
      WHERE review_id = $1 AND user_id = $2
      `,
      [reviewId, DEMO_USER_ID]
    );

    if (existing.rowCount && existing.rows[0].vote === vote) {
      await pool.query(
        `
        DELETE FROM review_votes
        WHERE review_id = $1 AND user_id = $2
        `,
        [reviewId, DEMO_USER_ID]
      );
    } else {
      await pool.query(
        `
        INSERT INTO review_votes (review_id, user_id, vote)
        VALUES ($1, $2, $3)
        ON CONFLICT (review_id, user_id)
        DO UPDATE SET vote = EXCLUDED.vote
        `,
        [reviewId, DEMO_USER_ID, vote]
      );
    }

    const summary = await pool.query<VoteSummaryRow>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
        MAX(CASE WHEN user_id = $2 THEN vote ELSE NULL END) AS user_vote
      FROM review_votes
      WHERE review_id = $1
      `,
      [reviewId, DEMO_USER_ID]
    );

    const row = summary.rows[0];

    return NextResponse.json({
      ok: true,
      upvotes: Number(row?.upvotes ?? 0),
      downvotes: Number(row?.downvotes ?? 0),
      userVote:
        row?.user_vote === 1 ? 1 : row?.user_vote === -1 ? -1 : 0,
    });
  } catch (e: any) {
    console.error("POST /api/reviews/vote error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}