import Link from "next/link";
import { headers } from "next/headers";

type TMDBItem = {
  source: "tmdb";
  source_id: string;
  type: "movie" | "series";
  title: string;
  year: number | null;
  poster_path: string | null;
};

function posterUrl(poster_path: string | null) {
  if (!poster_path) return null;
  return `https://image.tmdb.org/t/p/w342${poster_path}`;
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function searchTMDB(q: string): Promise<TMDBItem[]> {
  if (!q) return [];

  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/api/tmdb/search?q=${encodeURIComponent(q)}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (!json?.ok) return [];
  const data = (json.data ?? []) as TMDBItem[];

  return data
    .filter((x) => x.title && x.title.trim().length > 0)
    .filter((x) => !x.year || x.year >= 1950);
}

function workHref(item: TMDBItem) {
  // tu página de detalle espera: /works/tmdb-movie-123 o /works/tmdb-tv-456
  const typeSlug = item.type === "series" ? "tv" : "movie";
  return `/works/tmdb-${typeSlug}-${item.source_id}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const results = await searchTMDB(q);

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Buscar</h1>
        <Link className="underline opacity-80 hover:opacity-100" href="/">
          Volver
        </Link>
      </div>

      <form className="mt-6 flex gap-2" action="/search" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Busca una película o serie..."
          className="w-full max-w-xl rounded-lg border bg-transparent px-3 py-2"
        />
        <button className="rounded-lg border px-4 py-2">Buscar</button>
      </form>

      {!q && (
        <p className="mt-6 opacity-70">
          Escribe algo arriba y pulsa <b>Buscar</b>.
        </p>
      )}

      {q && results.length === 0 && (
        <p className="mt-6 opacity-70">No hay resultados para “{q}”.</p>
      )}

      {results.length > 0 && (
        <section className="mt-8">
          <p className="mb-3 opacity-70">
            Resultados para <b>“{q}”</b>
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => {
              const img = posterUrl(item.poster_path);
              const href = workHref(item);

              return (
                <Link
                  key={`${item.source}-${item.source_id}`}
                  href={href}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                  title={item.title}
                >
                  <div className="flex gap-4 p-4">
                    <div className="h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                      {img ? (
                        <img
                          src={img}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                          Sin póster
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="truncate text-lg font-semibold group-hover:underline">
                          {item.title}
                        </h2>
                        <span className="text-sm opacity-70">
                          {item.year ?? "—"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm opacity-80">
                        {item.type === "movie" ? "Película" : "Serie"} · TMDB
                      </p>

                      <p className="mt-2 text-xs opacity-60">
                        Abrir ficha →
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}