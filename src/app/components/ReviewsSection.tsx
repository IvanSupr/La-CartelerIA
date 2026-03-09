"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isUserReview?: boolean;
  userVote?: 1 | -1 | 0;
};

type Props = {
  workKey: string;
  workId: string;
  workTitle?: string;
  workYear?: number | null;
  workOverview?: string;
  workGenres?: string[];
  workCast?: string[];
  workDirector?: string | null;
};

type GateMsg = {
  role: "user" | "assistant";
  content: string;
};

const FAKE_REVIEWS: Record<string, Review[]> = {
  "tmdb-movie-438631": [
    {
      id: "fake-1",
      author: "Cinefilo92",
      rating: 9,
      date: "2026-03-01",
      content:
        "Me gustó muchísimo. Visualmente es espectacular y el mundo que plantea está muy bien construido. Se toma su tiempo, pero eso le sienta bien.",
      upvotes: 18,
      downvotes: 2,
    },
    {
      id: "fake-2",
      author: "LunaFrames",
      rating: 8,
      date: "2026-03-03",
      content:
        "La ambientación y la música son una pasada. Quizá el ritmo es algo pausado para algunos, pero a mí me atrapó bastante.",
      upvotes: 11,
      downvotes: 1,
    },
    {
      id: "fake-3",
      author: "PopcornUser",
      rating: 7,
      date: "2026-03-05",
      content:
        "No es una película para todo el mundo, pero tiene mucha personalidad. Destacaría sobre todo la dirección y el reparto.",
      upvotes: 9,
      downvotes: 3,
    },
  ],
  "tmdb-tv-255661": [
    {
      id: "fake-1",
      author: "SeriesAdicto",
      rating: 8,
      date: "2026-03-02",
      content:
        "Me sorprendió para bien. Tiene buen misterio, un protagonista carismático y un tono bastante entretenido.",
      upvotes: 12,
      downvotes: 1,
    },
    {
      id: "fake-2",
      author: "MoriartyFan",
      rating: 7,
      date: "2026-03-04",
      content:
        "No reinventa nada, pero se deja ver muy bien. La ambientación y el enfoque juvenil funcionan.",
      upvotes: 8,
      downvotes: 2,
    },
    {
      id: "fake-3",
      author: "NieblaLondres",
      rating: 8,
      date: "2026-03-06",
      content:
        "Me gustó más de lo que esperaba. Tiene una vibra aventurera bastante chula y ganas de seguir viéndola.",
      upvotes: 10,
      downvotes: 1,
    },
  ],
};

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function getDefaultReviews(workKey: string): Review[] {
  return (
    FAKE_REVIEWS[workKey] ?? [
      {
        id: "fake-default-1",
        author: "PantallaFan",
        rating: 8,
        date: "2026-03-07",
        content:
          "Buena obra en general. Tiene detalles interesantes, buen acabado visual y deja cosas de las que hablar.",
        upvotes: 6,
        downvotes: 1,
      },
      {
        id: "fake-default-2",
        author: "CriticoCasual",
        rating: 7,
        date: "2026-03-07",
        content:
          "Entretenida y bastante recomendable si te gusta este tipo de historias. No perfecta, pero sí disfrutable.",
        upvotes: 4,
        downvotes: 0,
      },
      {
        id: "fake-default-3",
        author: "ButacaNocturna",
        rating: 8,
        date: "2026-03-07",
        content:
          "Lo mejor para mí fue el conjunto: dirección, interpretaciones y atmósfera. Me dejó una sensación bastante buena.",
        upvotes: 5,
        downvotes: 1,
      },
    ]
  );
}

function isFakeReviewId(id: string) {
  return id.startsWith("fake-");
}

export default function ReviewsSection({
  workKey,
  workId,
  workTitle = "",
  workYear = null,
  workOverview = "",
  workGenres = [],
  workCast = [],
  workDirector = "",
}: Props) {
  const fakeReviews = useMemo(() => getDefaultReviews(workKey), [workKey]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [open, setOpen] = useState(false);

  const [author, setAuthor] = useState("user_test_1");
  const [rating, setRating] = useState("8");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const [gateStep, setGateStep] = useState(0);
  const [gateTone, setGateTone] = useState("");
  const [gateMessages, setGateMessages] = useState<GateMsg[]>([]);
  const [gateInput, setGateInput] = useState("");
  const [gateApproved, setGateApproved] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [votingReviewId, setVotingReviewId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!workId) return;

    setLoadingReviews(true);

    try {
      const res = await fetch(`/api/reviews?workId=${encodeURIComponent(workId)}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (json?.ok) {
        const dbReviews: Review[] = Array.isArray(json.reviews) ? json.reviews : [];
        setReviews([...dbReviews, ...fakeReviews]);
      } else {
        setReviews([...fakeReviews]);
      }
    } catch {
      setReviews([...fakeReviews]);
    } finally {
      setLoadingReviews(false);
    }
  }, [workId, fakeReviews]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  function resetForm() {
    setAuthor("user_test_1");
    setRating("8");
    setContent("");
    setError("");
    setGateStep(0);
    setGateTone("");
    setGateMessages([]);
    setGateInput("");
    setGateApproved(false);
    setGateLoading(false);
    setPublishing(false);
  }

  function closeModal() {
    setOpen(false);
    setError("");
  }

  async function startGate() {
    setGateLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/review-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 0,
          messages: [],
          work: {
            title: workTitle,
            year: workYear,
            overview: workOverview,
            genres: workGenres,
            cast: workCast,
            director: workDirector,
          },
        }),
      });

      const json = await res.json();

      if (!json?.ok) {
        setError(json?.error ?? "No se pudo iniciar la validación.");
        return;
      }

      setGateTone(json.tone ?? "");
      setGateStep(1);
      setGateMessages(
        json.question ? [{ role: "assistant", content: json.question }] : []
      );
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setGateLoading(false);
    }
  }

  async function sendGateAnswer() {
    const text = gateInput.trim();
    if (!text || gateLoading) return;

    const nextMessages: GateMsg[] = [
      ...gateMessages,
      { role: "user", content: text },
    ];

    setGateMessages(nextMessages);
    setGateInput("");
    setGateLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/review-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: gateStep,
          tone: gateTone,
          messages: nextMessages,
          work: {
            title: workTitle,
            year: workYear,
            overview: workOverview,
            genres: workGenres,
            cast: workCast,
            director: workDirector,
          },
        }),
      });

      const json = await res.json();

      if (!json?.ok) {
        setError(json?.error ?? "No se pudo continuar la validación.");
        return;
      }

      setGateTone(json.tone ?? gateTone);

      if (json.mode === "approved" && json.approved && json.draft) {
        setGateApproved(true);
        setContent(json.draft);
        setGateMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Perfecto, ya tengo suficiente contexto. Te he generado un borrador que puedes editar antes de publicar.",
          },
        ]);
        return;
      }

      if (json.mode === "rejected") {
        setError(
          json.message ??
            "No he podido verificar que hayas visto esta obra. Inténtalo otra vez con respuestas más concretas."
        );
        setGateMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              json.message ??
              "No he podido verificar que hayas visto esta obra. Inténtalo otra vez con respuestas más concretas.",
          },
        ]);
        return;
      }

      if (json.question) {
        setGateStep((prev) => prev + 1);
        setGateMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.question },
        ]);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setGateLoading(false);
    }
  }

  async function handleVote(reviewId: string, vote: 1 | -1) {
    const previous = reviews;

    setVotingReviewId(reviewId);

    setReviews((prev) =>
      prev.map((review) => {
        if (review.id !== reviewId) return review;

        const currentVote = review.userVote ?? 0;
        let nextUpvotes = review.upvotes;
        let nextDownvotes = review.downvotes;
        let nextUserVote: 1 | -1 | 0 = currentVote;

        if (currentVote === vote) {
          if (vote === 1) nextUpvotes = Math.max(0, nextUpvotes - 1);
          if (vote === -1) nextDownvotes = Math.max(0, nextDownvotes - 1);
          nextUserVote = 0;
        } else {
          if (currentVote === 1) nextUpvotes = Math.max(0, nextUpvotes - 1);
          if (currentVote === -1) nextDownvotes = Math.max(0, nextDownvotes - 1);

          if (vote === 1) nextUpvotes += 1;
          if (vote === -1) nextDownvotes += 1;

          nextUserVote = vote;
        }

        return {
          ...review,
          upvotes: nextUpvotes,
          downvotes: nextDownvotes,
          userVote: nextUserVote,
        };
      })
    );

    try {
      if (isFakeReviewId(reviewId)) {
        return;
      }

      const res = await fetch("/api/reviews/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId, vote }),
      });

      const json = await res.json();

      if (!json?.ok) {
        setReviews(previous);
        setError(json?.error ?? "No se pudo guardar el voto.");
        return;
      }

      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                upvotes: Number(json.upvotes ?? 0),
                downvotes: Number(json.downvotes ?? 0),
                userVote:
                  json.userVote === 1 ? 1 : json.userVote === -1 ? -1 : 0,
              }
            : review
        )
      );
    } catch (e: any) {
      setReviews(previous);
      setError(String(e?.message ?? e));
    } finally {
      setVotingReviewId(null);
    }
  }

  async function submitReview() {
    const cleanAuthor = author.trim();
    const cleanContent = content.trim();
    const numericRating = Number(rating);

    if (!gateApproved) {
      setError("Antes de publicar debes pasar la validación con IA.");
      return;
    }

    if (!workId) {
      setError("No se ha encontrado el identificador interno de la obra.");
      return;
    }

    if (!cleanAuthor) {
      setError("Introduce un nombre de usuario.");
      return;
    }

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 10) {
      setError("La nota debe estar entre 1 y 10.");
      return;
    }

    if (cleanContent.length < 20) {
      setError("La reseña debe tener al menos 20 caracteres.");
      return;
    }

    setPublishing(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workId,
          username: cleanAuthor,
          rating: numericRating,
          content: cleanContent,
        }),
      });

      const json = await res.json();

      if (!json?.ok) {
        setError(json?.error ?? "No se pudo guardar la reseña.");
        return;
      }

      await loadReviews();
      resetForm();
      setOpen(false);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Reseñas
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Opiniones públicas de otros usuarios
            </p>
          </div>

          <button
            onClick={() => {
              setOpen(true);
              resetForm();
            }}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Escribir reseña
          </button>
        </div>

        {loadingReviews ? (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            Cargando reseñas...
          </div>
        ) : null}

        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {review.author}
                    </p>
                    {review.isUserReview ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Tu reseña
                      </span>
                    ) : null}
                    {isFakeReviewId(review.id) ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60">
                        Demo
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-white/50">
                    {formatDate(review.date)}
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
                  ⭐ {review.rating}/10
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/85">
                {review.content}
              </p>

              <div className="mt-4 flex items-center gap-3 text-sm">
                <button
                  disabled={votingReviewId === review.id}
                  onClick={() => handleVote(review.id, 1)}
                  className={[
                    "rounded-lg border px-3 py-1.5 transition disabled:opacity-60",
                    review.userVote === 1
                      ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                  ].join(" ")}
                >
                  + {review.upvotes}
                </button>

                <button
                  disabled={votingReviewId === review.id}
                  onClick={() => handleVote(review.id, -1)}
                  className={[
                    "rounded-lg border px-3 py-1.5 transition disabled:opacity-60",
                    review.userVote === -1
                      ? "border-red-400/30 bg-red-400/15 text-red-300"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                  ].join(" ")}
                >
                  - {review.downvotes}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#10151c] p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Publicar reseña
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Antes de publicar, la IA te hará unas preguntas para generar un borrador.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            {!gateApproved ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Validación con IA
                    </p>
                    <p className="text-xs text-white/50">
                      Responde con naturalidad y sin spoilers fuertes.
                    </p>
                  </div>

                  {gateTone ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      modo: {gateTone}
                    </span>
                  ) : null}
                </div>

                {gateMessages.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white/75">
                      La IA va a comprobar de forma aproximada si parece que has visto la obra y luego te propondrá un borrador de reseña.
                    </p>

                    <button
                      onClick={startGate}
                      disabled={gateLoading}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                    >
                      Empezar validación
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                      {gateMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={[
                            "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                            msg.role === "user"
                              ? "ml-auto bg-emerald-500 text-black"
                              : "mr-auto bg-white/10 text-white",
                          ].join(" ")}
                        >
                          {msg.content}
                        </div>
                      ))}

                      {gateLoading ? (
                        <div className="mr-auto max-w-[90%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                          Pensando…
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        value={gateInput}
                        onChange={(e) => setGateInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendGateAnswer();
                        }}
                        placeholder="Responde a la IA..."
                        disabled={gateLoading}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 disabled:opacity-60"
                      />
                      <button
                        onClick={sendGateAnswer}
                        disabled={gateLoading}
                        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                      >
                        Enviar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {gateApproved ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  Validación completada. Ya puedes revisar el borrador, editarlo o escribir tu reseña como quieras.
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Usuario
                  </label>
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Nota (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Reseña final
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="Edita el borrador o escribe tu propia reseña..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      resetForm();
                      closeModal();
                    }}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={submitReview}
                    disabled={publishing}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {publishing ? "Publicando..." : "Publicar reseña"}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}