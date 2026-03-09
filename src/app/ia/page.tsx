"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Msg = { role: "user" | "ai"; text: string };
type RecentMsg = { role: "user" | "assistant"; content: string };

const INITIAL_AI_MESSAGE =
  "Estoy listo. Pregúntame cosas sobre la obra (director, reparto, curiosidades, similares, etc.).";

export default function IAPage() {
  const sp = useSearchParams();

  const workTitle = sp.get("work") ?? "";
  const workYear = sp.get("year");
  const workOverview = sp.get("overview") ?? "";
  const workDirector = sp.get("director") ?? "";
  const fromHref = sp.get("from") ?? "";

  const workGenres = useMemo(() => {
    const raw = sp.get("genres") ?? "";
    return raw
      .split("|")
      .map((g) => g.trim())
      .filter(Boolean);
  }, [sp]);

  const workCast = useMemo(() => {
    const raw = sp.get("cast") ?? "";
    return raw
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [sp]);

  const work = useMemo(
    () => ({
      title: workTitle,
      year: workYear ? Number(workYear) : null,
      overview: workOverview,
      genres: workGenres,
      cast: workCast,
      director: workDirector,
    }),
    [workTitle, workYear, workOverview, workGenres, workCast, workDirector]
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([{ role: "ai", text: INITIAL_AI_MESSAGE }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function getRecentMessages(): RecentMsg[] {
    const cleaned = messages.filter((msg) => msg.text !== INITIAL_AI_MESSAGE);

    return cleaned.slice(-2).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    }));
  }

  async function send() {
    const q = input.trim();
    if (!q || loading) return;

    const recentMessages = getRecentMessages();

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: q }]);

    try {
      const res = await fetch("/api/ai/work-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          work,
          recentMessages,
        }),
      });

      const json = await res.json();

      if (!json?.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: `❌ Error: ${json?.error ?? "No se pudo generar respuesta"}`,
          },
        ]);
        return;
      }

      const text = json.answer ?? json.text ?? "(sin respuesta)";

      setMessages((prev) => [...prev, { role: "ai", text }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `❌ Error: ${String(e?.message ?? e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Chat IA</h1>

          <div className="flex items-center gap-3">
            {fromHref ? (
              <Link href={fromHref} className="text-sm text-white/70 hover:text-white">
                ← Volver a la ficha
              </Link>
            ) : null}

            <Link href="/" className="text-sm text-white/70 hover:text-white">
              Inicio
            </Link>
          </div>
        </div>

        {workTitle ? (
          <div className="mt-2 space-y-1 text-sm text-white/60">
            <p>
              Contexto: <span className="text-white/80">{workTitle}</span>
              {work.year ? ` (${work.year})` : ""}
            </p>

            {work.director ? (
              <p>
                Dirección/creación:{" "}
                <span className="text-white/75">{work.director}</span>
              </p>
            ) : null}

            {work.genres.length > 0 ? (
              <p>
                Géneros:{" "}
                <span className="text-white/75">{work.genres.join(" · ")}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/60">
            Sin contexto de obra (puedes preguntar igual).
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="h-[55vh] overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={[
                    "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "ml-auto bg-emerald-500 text-black"
                      : "mr-auto bg-white/10 text-white",
                  ].join(" ")}
                >
                  {msg.text}
                </div>
              ))}

              {loading && (
                <div className="mr-auto max-w-[90%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                  Pensando…
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escribe tu pregunta sobre esta obra..."
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
            >
              Enviar
            </button>
          </div>

          <p className="mt-3 text-xs text-white/50">
            Puedes preguntar libremente: “¿Quién dirigió esta peli?”, “¿y qué más hizo?”,
            “¿sale alguien conocido?”, “¿por qué gustó tanto?”.
          </p>
        </div>
      </section>
    </main>
  );
}