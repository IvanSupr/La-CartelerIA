import { NextResponse } from "next/server";

type RecentMessage = {
  role: "user" | "assistant";
  content: string;
};

function limitText(text: string, max = 500) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildPrompt(body: any) {
  const work = body?.work ?? {};
  const userMessage = cleanText(body?.message);

  const title = cleanText(work.title) || "Obra";
  const year =
    typeof work.year === "number" && Number.isFinite(work.year)
      ? work.year
      : null;

  const overview = limitText(cleanText(work.overview), 420);
  const genres = Array.isArray(work.genres)
    ? work.genres
        .map((g: unknown) => cleanText(g))
        .filter(Boolean)
        .slice(0, 4)
        .join(", ")
    : "";
  const cast = Array.isArray(work.cast)
    ? work.cast
        .map((c: unknown) => cleanText(c))
        .filter(Boolean)
        .slice(0, 5)
        .join(", ")
    : "";
  const director = cleanText(work.director);

  const recentMessagesRaw = Array.isArray(body?.recentMessages)
    ? body.recentMessages
    : [];

  const recentMessages: RecentMessage[] = recentMessagesRaw
    .filter(
      (msg: any) =>
        msg &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim()
    )
    .slice(-2)
    .map((msg: any) => ({
      role: msg.role,
      content: limitText(msg.content.trim(), 220),
    }));

  const instructions = `
Eres un asistente de cine y series de "La CartelerIA".
Responde siempre en español.
Sé claro, directo y útil.
Mantén la respuesta clara y concisa, pero completa.
Normalmente responde entre 70 y 140 palabras.
Si el usuario pide identificar personajes, actores, director o detalles concretos, da la información principal y una breve aclaración extra si aporta valor.
No inventes datos concretos si no aparecen en el contexto.
Si no puedes asegurar algo, dilo con honestidad.
Si el usuario hace una pregunta de seguimiento, usa el contexto reciente.
Si el usuario pide spoilers, avisa antes de darlos.
`.trim();

  const context = `
OBRA:
- Título: ${title}${year ? ` (${year})` : ""}
- Géneros: ${genres || "—"}
- Director/Creador: ${director || "—"}
- Reparto principal: ${cast || "—"}
- Sinopsis: ${overview || "—"}
`.trim();

  const recentContext =
    recentMessages.length > 0
      ? `
CONTEXTO RECIENTE:
${recentMessages
  .map((msg) => `- ${msg.role === "user" ? "Usuario" : "Asistente"}: ${msg.content}`)
  .join("\n")}
`.trim()
      : "";

  const prompt = [context, recentContext, `PREGUNTA ACTUAL DEL USUARIO: ${userMessage}`]
    .filter(Boolean)
    .join("\n\n");

  return { userMessage, instructions, prompt };
}

function extractAnswer(json: any) {
  if (typeof json?.output_text === "string" && json.output_text.trim()) {
    return json.output_text.trim();
  }

  if (Array.isArray(json?.output)) {
    const joined = json.output
      .flatMap((item: any) => item?.content ?? [])
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (joined) return joined;
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { userMessage, instructions, prompt } = buildPrompt(body);

    if (!userMessage) {
      return NextResponse.json(
        { ok: false, error: "Missing message" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        reasoning: { effort: "low" },
        instructions,
        input: prompt,
        max_output_tokens: 220,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        json?.error?.message ??
        json?.message ??
        `OpenAI error ${res.status}`;

      return NextResponse.json(
        {
          ok: false,
          error: message,
        },
        { status: res.status }
      );
    }

    const answer = extractAnswer(json);

    if (!answer) {
      return NextResponse.json(
        {
          ok: false,
          error: "La API respondió, pero sin texto útil.",
          debug: {
            hasOutputText: typeof json?.output_text === "string",
            outputLength: Array.isArray(json?.output) ? json.output.length : 0,
            status: json?.status ?? null,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      answer,
      provider: "openai",
      model: "gpt-5-mini",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}