import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing TMDB_READ_TOKEN in .env.local" },
      { status: 500 }
    );
  }

  // Trending de la semana (mezcla pelis + series)
  const url =
    "https://api.themoviedb.org/3/trending/all/week?language=es-ES";

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    // cache suave para no fundir TMDB
    next: { revalidate: 60 * 10 },
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json(
      { ok: false, error: `TMDB error ${res.status}: ${txt}` },
      { status: 500 }
    );
  }

  const json = await res.json();

  const data = (json.results ?? []).map((it: any) => ({
    source: "tmdb",
    source_id: String(it.id),
    type: it.media_type === "tv" ? "series" : "movie",
    title: it.title ?? it.name ?? "Sin título",
    year: Number(
      (it.release_date ?? it.first_air_date ?? "").slice(0, 4)
    ) || null,
    poster_path: it.poster_path ?? null,
    backdrop_path: it.backdrop_path ?? null,
    vote_average: typeof it.vote_average === "number" ? it.vote_average : null,
  }));

  return NextResponse.json({ ok: true, data });
}