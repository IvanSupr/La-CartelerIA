import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import FavoriteButton from "@/app/components/FavoriteButton";
import ReviewsSection from "@/app/components/ReviewsSection";

type TmdbMediaType = "movie" | "tv";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function parseWorkId(raw: string | undefined) {
  if (!raw) return null;
  // Formato: tmdb-movie-799882 | tmdb-tv-1399
  const parts = raw.split("-").filter(Boolean);
  if (parts.length !== 3) return null;

  const [source, mediaType, sourceId] = parts;
  if (source !== "tmdb") return null;
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  if (!sourceId) return null;

  return { mediaType: mediaType as TmdbMediaType, sourceId };
}

function yearFromDate(d?: string | null) {
  if (!d) return null;
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

function minutesToHhMm(min?: number | null) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
}

async function tmdbFetch(path: string) {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("Missing TMDB_READ_TOKEN in .env.local");

  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (res.status === 404) notFound();
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TMDB error ${res.status}: ${txt}`);
  }
  return res.json() as Promise<any>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// asegura UUID interno (works.id) para esta obra TMDB
async function ensureWorkId(payload: {
  source: "tmdb";
  workType: "movie" | "tv";
  sourceId: string;
  title: string;
  year: number | null;
  posterPath: string | null;
}) {
  const res = await fetch(`${BASE_URL}/api/works/ensure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? "ensure failed");
  return json.workId as string;
}

function pickTrailerUrl(videos: any): string | null {
  const results: any[] = Array.isArray(videos?.results) ? videos.results : [];
  const yt = results.filter((v) => v.site === "YouTube");
  const trailer =
    yt.find(
      (v) =>
        v.type === "Trailer" &&
        (v.official || v.name?.toLowerCase().includes("tráiler"))
    ) ||
    yt.find((v) => v.type === "Trailer") ||
    yt.find((v) => v.type === "Teaser") ||
    yt[0];

  if (!trailer?.key) return null;
  return `https://www.youtube.com/watch?v=${trailer.key}`;
}

function pickDirectorOrCreator(
  mediaType: TmdbMediaType,
  credits: any,
  details: any
) {
  if (mediaType === "movie") {
    const crew: any[] = Array.isArray(credits?.crew) ? credits.crew : [];
    const director = crew.find((c) => c.job === "Director");
    return director?.name ?? null;
  }
  const creators: any[] = Array.isArray(details?.created_by)
    ? details.created_by
    : [];
  if (creators.length) return creators.map((c) => c.name).slice(0, 2).join(" · ");
  return null;
}

function providerNames(watchProviders: any, country = "ES") {
  const r = watchProviders?.results?.[country];
  if (!r) return { flatrate: [], rent: [], buy: [] };

  const take = (arr: any[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((p) => p.provider_name)
      .filter(Boolean)
      .slice(0, 6);

  return {
    flatrate: take(r.flatrate),
    rent: take(r.rent),
    buy: take(r.buy),
  };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const parsed = parseWorkId(id);
  if (!parsed) notFound();

  const { mediaType, sourceId } = parsed;

  const [details, credits, videos, watchProviders] = await Promise.all([
    tmdbFetch(`/${mediaType}/${sourceId}?language=es-ES`),
    tmdbFetch(`/${mediaType}/${sourceId}/credits?language=es-ES`),
    tmdbFetch(`/${mediaType}/${sourceId}/videos?language=es-ES`),
    tmdbFetch(`/${mediaType}/${sourceId}/watch/providers`),
  ]);

  const title =
    mediaType === "movie"
      ? details?.title ?? "Sin título"
      : details?.name ?? "Sin título";

  const originalTitle =
    mediaType === "movie" ? details?.original_title : details?.original_name;

  const overview = details?.overview ?? "";
  const tagline =
    typeof details?.tagline === "string" && details.tagline.trim()
      ? details.tagline
      : null;

  const poster = details?.poster_path
    ? `${TMDB_IMG}/w500${details.poster_path}`
    : null;
  const backdrop = details?.backdrop_path
    ? `${TMDB_IMG}/original${details.backdrop_path}`
    : null;

  const year =
    mediaType === "movie"
      ? yearFromDate(details?.release_date)
      : yearFromDate(details?.first_air_date);

  const voteAverageRaw = details?.vote_average;
  const voteAverage =
    typeof voteAverageRaw === "number" && Number.isFinite(voteAverageRaw)
      ? voteAverageRaw
      : null;

  const voteText =
    voteAverage !== null && voteAverage > 0
      ? (Math.round(voteAverage * 10) / 10).toFixed(1)
      : "—";

  const voteCountRaw = details?.vote_count;
  const voteCount =
    typeof voteCountRaw === "number" &&
    Number.isFinite(voteCountRaw) &&
    voteCountRaw > 0
      ? voteCountRaw
      : null;

  const genres: string[] = Array.isArray(details?.genres)
    ? details.genres.map((g: any) => g?.name).filter(Boolean).slice(0, 6)
    : [];

  const directorOrCreator = pickDirectorOrCreator(mediaType, credits, details);

  const cast: any[] = Array.isArray(credits?.cast) ? credits.cast : [];
  const topCast = cast.slice(0, 12).map((p) => ({
    id: p.id,
    name: p.name,
    character: p.character,
    profile: p.profile_path ? `${TMDB_IMG}/w185${p.profile_path}` : null,
  }));

  const trailerUrl = pickTrailerUrl(videos);
  const providers = providerNames(watchProviders, "ES");

  const runtime =
    mediaType === "movie" ? minutesToHhMm(details?.runtime ?? null) : null;

  const seasons =
    mediaType === "tv" && typeof details?.number_of_seasons === "number"
      ? details.number_of_seasons
      : null;

  const episodes =
    mediaType === "tv" && typeof details?.number_of_episodes === "number"
      ? details.number_of_episodes
      : null;

  // UUID interno para user_works
  const workId = await ensureWorkId({
    source: "tmdb",
    workType: mediaType,
    sourceId,
    title,
    year: year ? Number(year) : null,
    posterPath: details?.poster_path ?? null,
  });

  const currentWorkPath = `/works/${id}`;

  const iaHref = `/ia?${new URLSearchParams({
    work: title,
    year: year ?? "",
    overview: overview.slice(0, 280),
    director: directorOrCreator ?? "",
    genres: genres.slice(0, 3).join("|"),
    cast: topCast
      .map((p) => p.name)
      .filter(Boolean)
      .slice(0, 5)
      .join("|"),
    from: currentWorkPath,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            La Carteler<span className="text-emerald-400">IA</span>
          </Link>

          <nav className="flex items-center gap-5 text-sm text-white/80">
            <Link href="/search" className="hover:text-white">
              Buscar
            </Link>
            <Link href="/lists" className="hover:text-white">
              Listas
            </Link>
            <Link href="/profile" className="hover:text-white">
              Perfil
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="relative flex min-h-[560px] w-full flex-col">
          {backdrop ? (
            <Image
              src={backdrop}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-[#0b0f14] to-[#0b0f14]" />
          )}

          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f14] via-[#0b0f14]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f14]/95 via-[#0b0f14]/55 to-transparent" />

          <div className="relative z-10 flex w-full flex-1 items-end pb-12 pt-28">
            <div className="mx-auto flex w-full max-w-6xl items-end px-6">
              <div className="flex w-full flex-col gap-6 md:flex-row md:items-end">
                <div className="relative h-[260px] w-[175px] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl md:h-[340px] md:w-[230px]">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="230px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
                      Sin póster
                    </div>
                  )}
                </div>

                <div className="max-w-3xl pb-2">
                  <Link
                    href="/"
                    className="mb-3 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
                  >
                    ← Volver
                  </Link>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {title}{" "}
                    {year ? <span className="text-white/60">({year})</span> : null}
                  </h1>

                  {originalTitle && originalTitle !== title ? (
                    <p className="mt-1 text-sm text-white/60">
                      Título original: {originalTitle}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {mediaType === "movie" ? "Película" : "Serie"}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        aria-hidden="true"
                        className="text-amber-400"
                        fill="currentColor"
                      >
                        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      <span className="font-medium">{voteText}</span>
                      {voteCount ? (
                        <span className="text-white/60">
                          · {voteCount.toLocaleString("es-ES")}
                        </span>
                      ) : null}
                    </span>

                    {runtime ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {runtime}
                      </span>
                    ) : null}

                    {seasons ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        {seasons} temporadas{episodes ? ` · ${episodes} eps` : ""}
                      </span>
                    ) : null}

                    {directorOrCreator ? (
                      <span className="text-white/60">
                        · {mediaType === "movie" ? "Director" : "Creador"}:{" "}
                        {directorOrCreator}
                      </span>
                    ) : null}
                  </div>

                  {genres.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {genres.map((g) => (
                        <span
                          key={g}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {tagline ? (
                    <p className="mt-4 text-sm italic text-white/70">“{tagline}”</p>
                  ) : null}

                  <p className="mt-4 text-base leading-relaxed text-white/85">
                    {overview || "Sin descripción disponible."}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={iaHref}
                      className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
                    >
                      Iniciar conversación IA
                    </Link>

                    <FavoriteButton workId={workId} />

                    {trailerUrl ? (
                      <a
                        href={trailerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Ver tráiler ↗
                      </a>
                    ) : null}
                  </div>

                  {(providers.flatrate.length ||
                    providers.rent.length ||
                    providers.buy.length) ? (
                    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold">Dónde ver (ES)</p>
                      <div className="mt-2 space-y-2 text-sm text-white/75">
                        {providers.flatrate.length ? (
                          <p>
                            <span className="text-white/60">Streaming:</span>{" "}
                            {providers.flatrate.join(" · ")}
                          </p>
                        ) : null}
                        {providers.rent.length ? (
                          <p>
                            <span className="text-white/60">Alquiler:</span>{" "}
                            {providers.rent.join(" · ")}
                          </p>
                        ) : null}
                        {providers.buy.length ? (
                          <p>
                            <span className="text-white/60">Compra:</span>{" "}
                            {providers.buy.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-5 text-xs text-white/50">
                    Fuente: TMDB · {mediaType} · ID: {sourceId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">Reparto</h2>
          <p className="mt-1 text-sm text-white/60">
            Principales actores/personajes
          </p>
        </div>

        {topCast.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            No hay reparto disponible.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {topCast.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-black/20">
                  {p.profile ? (
                    <Image
                      src={p.profile}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                      Sin foto
                    </div>
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{p.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-white/60">
                  {p.character || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      <ReviewsSection
        workKey={id}
        workId={workId}
        workTitle={title}
        workYear={year ? Number(year) : null}
        workOverview={overview}
        workGenres={genres}
        workCast={topCast.map((p) => p.name).filter(Boolean).slice(0, 5)}
        workDirector={directorOrCreator}
      />


      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-6 text-sm text-white/60">
          La CartelerIA · Datos e imágenes por TMDB.
        </div>
      </footer>
    </main>
  );
}