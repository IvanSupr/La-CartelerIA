import Link from "next/link";
import Image from "next/image";

type Status = "favorite" | "watchlist" | "watched";

type ProfileResponse = {
  ok: boolean;
  error?: string;
  user?: { id: string; name: string };
  counts?: Record<Status, number>;
  recent?: Array<{
    status: Status;
    work_id: string; // UUID interno
    title: string;
    year: number | null;
    poster_url: string | null;
    source: string; // "tmdb"
    work_type: string; // "movie" | "tv"
    source_id: string; // id de TMDB
    created_at: string;
  }>;
};

function badgeLabel(status: Status) {
  if (status === "favorite") return "★ Favorito";
  if (status === "watchlist") return "⏳ Watchlist";
  return "✓ Visto";
}

function badgeClass(status: Status) {
  if (status === "favorite")
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  if (status === "watchlist")
    return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
}

export default async function ProfilePage() {
  const res = await fetch("http://localhost:3000/api/profile", {
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as ProfileResponse | null;

  if (!data?.ok) {
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

        <section className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-semibold">Perfil</h1>
          <p className="mt-3 text-white/70">
            No se pudo cargar el perfil:{" "}
            <span className="text-red-300">{data?.error ?? "Error"}</span>
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  const user = data.user!;
  const counts = data.counts ?? { favorite: 0, watchlist: 0, watched: 0 };
  const recent = data.recent ?? [];

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      {/* Header igual que el resto */}
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

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
          <p className="text-white/70">
            Sesión demo iniciada como{" "}
            <span className="font-semibold text-white">{user.name}</span>{" "}
            <span className="text-white/40">({user.id})</span>
          </p>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/60">Favoritos</p>
            <p className="mt-2 text-3xl font-semibold text-amber-200">
              {counts.favorite}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/60">Watchlist</p>
            <p className="mt-2 text-3xl font-semibold text-sky-200">
              {counts.watchlist}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/60">Vistas</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-200">
              {counts.watched}
            </p>
          </div>
        </div>

        {/* Recent */}
        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Últimos guardados</h2>
            <p className="mt-1 text-sm text-white/60">
              Los últimos 6 cambios que has hecho
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white"
            title="Volver"
          >
            Volver →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
            Aún no has guardado nada. Entra en una peli/serie y pulsa los botones
            (Favorito / Watchlist / Visto).
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {recent.map((w) => {
              const href = `/works/${w.source}-${w.work_type}-${w.source_id}`;
              return (
                <Link
                  key={`${w.work_id}-${w.status}-${w.created_at}`}
                  href={href}
                  className="group block"
                  title={w.title}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {w.poster_url ? (
                      <Image
                        src={w.poster_url}
                        alt={w.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 20vw, 12vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                        Sin póster
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold",
                          badgeClass(w.status),
                        ].join(" ")}
                      >
                        {badgeLabel(w.status)}
                      </span>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold">
                        {w.title}
                        {w.year ? (
                          <span className="text-white/60"> ({w.year})</span>
                        ) : null}
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
          Perfil demo · Datos guardados en PostgreSQL.
        </div>
      </footer>
    </main>
  );
}