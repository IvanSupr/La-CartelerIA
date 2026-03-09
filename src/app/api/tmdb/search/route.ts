import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) return NextResponse.json({ ok: true, data: [] });

  const token = process.env.TMDB_READ_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing TMDB_READ_TOKEN in .env.local" },
      { status: 500 }
    );
  }

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("query", q);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "es-ES");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `TMDB error: ${res.status}` },
      { status: 502 }
    );
  }

  const json = await res.json();

  const data = (json.results ?? [])
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .map((r: any) => ({
      source: "tmdb",
      source_id: String(r.id),
      type: r.media_type === "movie" ? "movie" : "series",
      title: r.media_type === "movie" ? r.title : r.name,
      year:
        (r.media_type === "movie" ? r.release_date : r.first_air_date)?.slice(
          0,
          4
        ) ?? null,
      poster_path: r.poster_path ?? null,
    }));

  return NextResponse.json({ ok: true, data });
}