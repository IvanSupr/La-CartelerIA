import Link from "next/link";
import Image from "next/image";

type TmdbCard = {
  source: "tmdb";
  source_id: string;
  type: "movie" | "series";
  title: string;
  year: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
};

const TMDB_IMG = "https://image.tmdb.org/t/p";

async function getTrending(): Promise<TmdbCard[]> {
  const res = await fetch("http://localhost:3000/api/tmdb/trending", {
    cache: "no-store",
  });
  const json = await res.json();
  return json.data ?? [];
}

function PosterCard({ item }: { item: TmdbCard }) {
  const poster = item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null;

  // Normalizamos "series" -> "tv" para el detalle de TMDB
  const typeSlug = item.type === "series" ? "tv" : "movie";

  return (
    <Link
      href={`/works/${item.source}-${typeSlug}-${item.source_id}`}
      className="group block"
      title={item.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {poster ? (
          <Image
            src={poster}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 20vw, 12vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
            Sin póster
          </div>
        )}

        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-white/70">
              {item.type === "movie" ? "Película" : "Serie"}
              {item.year ? ` · ${item.year}` : ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const trending = await getTrending();

  const heroBackdrop =
    trending.find((t) => t.backdrop_path)?.backdrop_path ?? null;

  const heroBg = heroBackdrop ? `${TMDB_IMG}/original${heroBackdrop}` : null;

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      {/* Top bar */}
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

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[520px] w-full">
          {/* Fondo */}
          {heroBg ? (
            <Image
              src={heroBg}
              alt="Hero background"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-[#0b0f14] to-[#0b0f14]" />
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f14] via-[#0b0f14]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f14]/95 via-[#0b0f14]/40 to-transparent" />

          {/* ✅ Contenido por encima (esto arregla el “desaparece”) */}
          <div className="relative z-20 mx-auto flex h-full max-w-6xl items-end px-6 pb-14">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                Descubre, guarda y recomienda · con IA
              </p>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Tu cine y series en un solo sitio.
              </h1>

              <p className="mt-4 text-base text-white/75 sm:text-lg">
                Explora tendencias, crea listas y guarda favoritos. Más adelante
                añadiremos recomendaciones con IA y colecciones personales.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
                >
                  Empezar a buscar
                </Link>
                <Link
                  href="#trending"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Ver tendencias
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending grid */}
      <section id="trending" className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Tendencias esta semana
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Pósters estilo Letterboxd · hover para ver info
            </p>
          </div>

          <Link href="/search" className="text-sm text-white/70 hover:text-white">
            Buscar más →
          </Link>
        </div>

        {trending.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            No se han podido cargar las tendencias (revisa TMDB_READ_TOKEN y la
            ruta /api/tmdb/trending).
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {trending.slice(0, 15).map((t) => (
              <PosterCard key={`${t.source}-${t.type}-${t.source_id}`} item={t} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-6 text-sm text-white/60">
          <p>
            La CartelerIA · Datos e imágenes por TMDB (añadiremos atribución/logo
            donde toque).
          </p>
        </div>
      </footer>
    </main>
  );
}