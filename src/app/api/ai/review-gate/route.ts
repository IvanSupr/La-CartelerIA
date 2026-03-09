import { NextResponse } from "next/server";

type GateMessage = {
  role: "user" | "assistant";
  content: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function limitText(text: string, max = 500) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function randomTone() {
  const n = Math.random() * 100;
  if (n < 1) return "strict";
  if (n < 3) return "kind";
  return "neutral";
}

function getKeywordSet(work: {
  title?: string;
  overview?: string;
  genres?: string[];
  cast?: string[];
  director?: string;
}) {
  const stopwords = new Set([
    "de",
    "la",
    "el",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "y",
    "o",
    "en",
    "con",
    "sin",
    "por",
    "para",
    "del",
    "al",
    "que",
    "se",
    "su",
    "sus",
    "como",
    "mas",
    "más",
    "muy",
    "pero",
    "esta",
    "este",
    "estos",
    "estas",
    "sobre",
    "entre",
    "durante",
    "tras",
    "desde",
    "hasta",
    "es",
    "son",
    "ser",
    "fue",
    "han",
    "hay",
    "the",
    "and",
    "of",
    "a",
    "to",
    "is",
    "an",
  ]);

  const raw = [
    cleanText(work.title),
    cleanText(work.overview),
    ...(Array.isArray(work.genres) ? work.genres : []),
    ...(Array.isArray(work.cast) ? work.cast : []),
    cleanText(work.director),
  ]
    .join(" ")
    .split(/[\s,.:;!?()[\]{}"“”'`´·/\\|-]+/g)
    .map((w) => normalize(w))
    .filter((w) => w && w.length >= 4 && !stopwords.has(w));

  return Array.from(new Set(raw));
}

function countKeywordMatches(answer: string, keywords: string[]) {
  const normalized = normalize(answer);
  let count = 0;

  for (const keyword of keywords) {
    if (keyword && normalized.includes(keyword)) count += 1;
  }

  return count;
}

function hasObviousMismatch(answer: string) {
  const normalized = normalize(answer);

  const weirdTerms = [
    "lana del rey",
    "benidorm",
    "playa",
    "barcelona",
    "real madrid",
    "futbol",
    "pokemon",
    "spiderman",
    "harry potter",
    "taylor swift",
  ];

  return weirdTerms.some((term) => normalized.includes(term));
}

function isTooGeneric(answer: string) {
  const normalized = normalize(answer);

  const genericPhrases = [
    "me gusto",
    "muy buena",
    "muy bueno",
    "increible",
    "esta bien",
    "buena experiencia",
    "muy entretenida",
  ];

  return (
    normalized.length < 18 ||
    genericPhrases.some((p) => normalized === p || normalized.startsWith(p))
  );
}

function analyzeMessages(userAnswers: string[], keywords: string[]) {
  let credibilityScore = 0;
  let mismatches = 0;
  let genericAnswers = 0;

  for (const answer of userAnswers) {
    const matches = countKeywordMatches(answer, keywords);
    const mismatch = hasObviousMismatch(answer);
    const generic = isTooGeneric(answer);

    if (mismatch) mismatches += 1;
    if (generic && matches === 0) genericAnswers += 1;
    if (!mismatch && matches >= 1) credibilityScore += 1;
    if (!mismatch && matches >= 2) credibilityScore += 1;
  }

  return {
    credibilityScore,
    mismatches,
    genericAnswers,
  };
}

function pickOneAvoiding(options: string[], previousAssistantMessages: string[]) {
  const normalizedPrevious = previousAssistantMessages.map((msg) => normalize(msg));

  const unused = options.filter((option) => {
    const normalizedOption = normalize(option);
    return !normalizedPrevious.some((prev) => prev === normalizedOption);
  });

  const pool = unused.length > 0 ? unused : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getNextQuestion(
  answerCount: number,
  workTitle: string,
  workCast: string[],
  workDirector: string,
  lastWasMismatch: boolean,
  tone: string,
  previousAssistantMessages: string[] = []
) {
  const castHint = workCast.length ? workCast.slice(0, 2).join(" y ") : "";
  const creatorHint = workDirector ? ` o la dirección de ${workDirector}` : "";

  const correctionPrefix =
    tone === "kind"
      ? "Eso no parece encajar del todo con esta obra. "
      : tone === "strict"
      ? "Eso no encaja con esta obra. "
      : "Eso no parece corresponder a esta obra. ";

  const corrected = lastWasMismatch ? correctionPrefix : "";

  const groups = [
    [
      `${corrected}¿Qué sensación te dejó la ambientación o el tono general de ${workTitle}?`,
      `${corrected}¿Cómo describirías el ambiente general de ${workTitle} sin entrar en spoilers?`,
      `${corrected}¿Qué impresión te produjo el mundo o la atmósfera de ${workTitle}?`,
      `${corrected}¿Qué te transmitió el estilo visual o el tono de ${workTitle}?`,
    ],
    [
      `${corrected}¿Qué personaje, actor o detalle interpretativo recuerdas mejor${
        castHint ? `, por ejemplo ${castHint}` : ""
      }?`,
      `${corrected}¿Hubo algún personaje o interpretación que te llamara especialmente la atención${
        castHint ? `, quizá ${castHint}` : ""
      }?`,
      `${corrected}¿Qué personaje o actuación destacarías más dentro de ${workTitle}?`,
      `${corrected}¿Qué papel o interpretación te pareció más memorable en la obra?`,
    ],
    [
      `${corrected}¿Qué escena, elemento visual o momento concreto recuerdas de la historia?`,
      `${corrected}¿Qué momento visual o narrativo se te quedó más grabado de la obra?`,
      `${corrected}¿Recuerdas alguna escena o situación concreta que te ayudara a meterte en la historia?`,
      `${corrected}¿Qué detalle de una escena o secuencia se te quedó más marcado?`,
    ],
    [
      `${corrected}¿Qué detalle del conflicto, del mundo o de los personajes te hizo pensar que estabas realmente metido en la obra${creatorHint}?`,
      `${corrected}¿Qué aspecto del conflicto o de la construcción del mundo te pareció más interesante${creatorHint}?`,
      `${corrected}¿Qué detalle de la historia o de sus personajes te hizo sentir que la obra tenía personalidad propia${creatorHint}?`,
      `${corrected}¿Qué elemento del desarrollo de la historia o del mundo te pareció más distintivo?`,
    ],
  ];

  const index = Math.min(answerCount, groups.length - 1);
  return pickOneAvoiding(groups[index], previousAssistantMessages);
}

function buildFallbackDraft(
  workTitle: string,
  year: number | null,
  userAnswers: string[]
) {
  const firstIdea =
    cleanText(userAnswers[0]) || "la ambientación y el tono general";
  const secondIdea =
    cleanText(userAnswers[1]) || "los personajes y su presencia en la historia";
  const thirdIdea =
    cleanText(userAnswers[2]) || "varios momentos concretos que dejan huella";

  return `${workTitle}${year ? ` (${year})` : ""} me ha parecido una obra con bastante personalidad y una propuesta muy sólida dentro de su estilo. Lo que más destacaría es ${firstIdea}, porque ayuda mucho a meterte en su mundo y a que la experiencia tenga fuerza propia. También me llamó la atención ${secondIdea}, ya que aporta interés a la historia y hace que el conjunto resulte más convincente. Además, ${thirdIdea} deja una sensación de escala y de implicación que hace que la obra tenga momentos memorables. En general, me parece una propuesta recomendable, bien construida y con varios elementos que la hacen destacar dentro de su género.`;
}

async function generateDraftWithAI(params: {
  workTitle: string;
  year: number | null;
  overview: string;
  genres: string[];
  cast: string[];
  director: string;
  userAnswers: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `
Genera un borrador de reseña en español de 140 a 220 palabras para esta obra.

OBRA:
- Título: ${params.workTitle}${params.year ? ` (${params.year})` : ""}
- Géneros: ${params.genres.join(", ") || "—"}
- Director/Creador: ${params.director || "—"}
- Reparto principal: ${params.cast.join(", ") || "—"}
- Sinopsis: ${params.overview || "—"}

IDEAS DEL USUARIO:
${params.userAnswers.map((a, i) => `- Respuesta ${i + 1}: ${a}`).join("\n")}

Instrucciones:
- escribe una reseña natural, clara y publicable
- no menciones que esto viene de una validación
- no inventes datos que no estén respaldados por la obra o las respuestas
- tono equilibrado y creíble
- devuelve la reseña completa en un solo bloque
- termina con una frase cerrada, no la dejes cortada
`.trim();

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        reasoning: { effort: "low" },
        input: prompt,
        max_output_tokens: 420,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) return null;

    let text = "";

    if (typeof json?.output_text === "string" && json.output_text.trim()) {
      text = json.output_text.trim();
    } else if (Array.isArray(json?.output)) {
      text = json.output
        .flatMap((item: any) => item?.content ?? [])
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join("")
        .trim();
    }

    if (!text) return null;

    const lastChar = text.slice(-1);
    const looksCut =
      text.length < 110 ||
      (![".", "!", "?", "”", '"'].includes(lastChar) && !text.endsWith("..."));

    if (looksCut) return null;

    return text;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const work = body?.work ?? {};
    const tone = cleanText(body?.tone) || randomTone();

    const messagesRaw = Array.isArray(body?.messages) ? body.messages : [];
    const messages: GateMessage[] = messagesRaw
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .slice(-10)
      .map((m: any) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    const workTitle = cleanText(work.title) || "Obra";
    const workYear =
      typeof work.year === "number" && Number.isFinite(work.year)
        ? work.year
        : null;
    const workOverview = limitText(cleanText(work.overview), 350);
    const workGenres = Array.isArray(work.genres)
      ? work.genres
          .map((g: unknown) => cleanText(g))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const workCast = Array.isArray(work.cast)
      ? work.cast
          .map((c: unknown) => cleanText(c))
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const workDirector = cleanText(work.director);

    const userAnswers = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    const previousAssistantMessages = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content);

    const answerCount = userAnswers.length;
    const reachedMaxQuestions = answerCount >= 4;

    const keywords = getKeywordSet({
      title: workTitle,
      overview: workOverview,
      genres: workGenres,
      cast: workCast,
      director: workDirector,
    });

    const analysis = analyzeMessages(userAnswers, keywords);
    const lastAnswer = userAnswers[userAnswers.length - 1] ?? "";
    const lastWasMismatch = lastAnswer ? hasObviousMismatch(lastAnswer) : false;

    if (answerCount === 0) {
      return NextResponse.json({
        ok: true,
        tone,
        mode: "question",
        approved: false,
        question: getNextQuestion(
          0,
          workTitle,
          workCast,
          workDirector,
          false,
          tone,
          previousAssistantMessages
        ),
        draft: null,
        message: null,
      });
    }

    const approvedEnough =
      analysis.credibilityScore >= 3 && analysis.mismatches === 0;

    if (approvedEnough) {
      const aiDraft = await generateDraftWithAI({
        workTitle,
        year: workYear,
        overview: workOverview,
        genres: workGenres,
        cast: workCast,
        director: workDirector,
        userAnswers,
      });

      return NextResponse.json({
        ok: true,
        tone,
        mode: "approved",
        approved: true,
        question: null,
        draft: aiDraft || buildFallbackDraft(workTitle, workYear, userAnswers),
        message: null,
      });
    }

    if (reachedMaxQuestions) {
      return NextResponse.json({
        ok: true,
        tone,
        mode: "rejected",
        approved: false,
        question: null,
        draft: null,
        message:
          "No he podido verificar que hayas visto esta obra. Algunas respuestas no encajan con ella o son demasiado genéricas. Inténtalo otra vez con detalles más concretos y reales.",
      });
    }

    return NextResponse.json({
      ok: true,
      tone,
      mode: "question",
      approved: false,
      question: getNextQuestion(
        answerCount,
        workTitle,
        workCast,
        workDirector,
        lastWasMismatch,
        tone,
        previousAssistantMessages
      ),
      draft: null,
      message: null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}