import Link from "next/link";
import Image from "next/image";

type Status = "favorite" | "watchlist" | "watched" | "all";

type Row = {
  status: "favorite" | "watchlist" | "watched";
  work_id: string;
  type: "movie" | "series";
  title: string;
  year: number | null;
  poster_url: string | null;
  source: string | null;
  work_type: "movie" | "tv" | null;
  source_id: string | null;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function label(status: Status) {
  if (status === "favorite") return "Favoritos";
  if (status === "watchlist") return "Watchlist";
  if (status === "watched") return "Vistos";
  return "Todo";
}

function hrefToWork(r: Row) {
  // Nuestra ruta de detalle: /works/tmdb-movie-123 o /works/tmdb-tv-456
  if (r.source === "tmdb" && r.work_type && r.source_id) {
    return `/works/tmdb-${r.work_type}-${r.source_id}`;
  }
  // fallback: si faltara info tmdb, volvemos al inicio
  return "/";
}

async function getList(status: Status): Promise<Row[]> {
  const url = `${BASE_URL}/api/user-works/list?status=${encodeURIComponent(
    status
  )}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  return (json?.ok ? (json.data as Row[]) : []) ?? [];
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status ?? "favorite") as Status;

  const data = await getList(status);

  const tabs: { key: Status; href: string }[] = [
    { key: "favorite", href: "/lists?status=favorite" },
    { key: "watchlist", href: "/lists?status=watchlist" },
    { key: "watched", href: "/lists?status=watched" },
    { key: "all", href: "/lists?status=all" },
  ];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      {/* Header simple */}
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

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Mis listas · {label(status)}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Lo que has guardado con los chips de la ficha.
            </p>
          </div>

          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Volver al inicio
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = t.key === status;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "border border-white/15 bg-white/10 text-white"
                    : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {label(t.key)}
              </Link>
            );
          })}
        </div>

        {/* Grid */}
        {data.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No tienes nada guardado en <b>{label(status)}</b> todavía.
            <div className="mt-4">
              <Link
                href="/search"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Buscar obras
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {data.map((r) => {
              const href = hrefToWork(r);
              return (
                <Link key={`${r.work_id}-${r.status}`} href={href} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {r.poster_url ? (
                      <Image
                        src={r.poster_url}
                        alt={r.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 20vw, 12vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                        Sin póster
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3">
                      <p className="line-clamp-2 text-sm font-semibold">
                        {r.title}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        {r.type === "movie" ? "Película" : "Serie"}
                        {r.year ? ` · ${r.year}` : ""}
                        {" · "}
                        {r.status}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-6 text-sm text-white/60">
          La CartelerIA · Biblioteca local (modo demo).
        </div>
      </footer>
    </main>
  );
}