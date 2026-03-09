"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type Status = "favorite" | "watchlist" | "watched";

type Props = {
  workId: string; // UUID interno (works.id)
  /** Si no lo pasas, el componente consulta a la API y ya */
  initial?: Partial<Record<Status, boolean>>;
};

const STATUS_LABEL: Record<Status, string> = {
  favorite: "★ Favorito",
  watchlist: "⏳ Watchlist",
  watched: "✓ Visto",
};

const STATUS_ORDER: Status[] = ["favorite", "watchlist", "watched"];

export default function FavoriteButton({ workId, initial }: Props) {
  const [state, setState] = useState<Record<Status, boolean>>({
    favorite: Boolean(initial?.favorite),
    watchlist: Boolean(initial?.watchlist),
    watched: Boolean(initial?.watched),
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(
    () => `workId=${encodeURIComponent(workId)}`,
    [workId]
  );

  // Cargar estado real (3 llamadas rápidas)
  useEffect(() => {
    let alive = true;
    setError(null);

    (async () => {
      try {
        const results = await Promise.all(
          STATUS_ORDER.map(async (status) => {
            const res = await fetch(
              `/api/user-works?${queryString}&status=${encodeURIComponent(
                status
              )}`,
              { cache: "no-store" }
            );
            const json = await res.json();
            return { status, json };
          })
        );

        if (!alive) return;

        const next: Record<Status, boolean> = { ...state };

        for (const r of results) {
          if (!r.json?.ok) {
            // si una falla, no rompemos todo
            setError(r.json?.error ?? "No se pudo comprobar estado");
            continue;
          }
          next[r.status] = Boolean(r.json.isFavorite);
        }

        setState(next);
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message ?? e));
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function toggle(status: Status) {
    setError(null);

    // UI optimista
    const prev = state[status];
    setState((s) => ({ ...s, [status]: !prev }));

    startTransition(async () => {
      try {
        const res = await fetch("/api/user-works", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workId, status }),
        });

        const json = await res.json();

        if (!json?.ok) {
          setState((s) => ({ ...s, [status]: prev }));
          setError(json?.error ?? "Error al guardar estado");
          return;
        }

        setState((s) => ({ ...s, [status]: Boolean(json.isFavorite) }));
      } catch (e: any) {
        setState((s) => ({ ...s, [status]: prev }));
        setError(String(e?.message ?? e));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((st) => {
          const active = state[st];

          return (
            <button
              key={st}
              onClick={() => toggle(st)}
              disabled={isPending}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                active
                  ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                  : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
              ].join(" ")}
              title={st}
            >
              {STATUS_LABEL[st]}
            </button>
          );
        })}
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}