import {
  buildSynthesisPrompt,
  generateWithOllama,
  jsonError,
  normalizeOllamaError,
  parseJsonObject,
} from "../../../../lib/server/ollama.js";

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Очікувався JSON body.");
  }

  const {
    question,
    mode = "synthesis",
    responses = [],
    provider = "ollama",
    model,
    format = "decision_brief",
  } = payload ?? {};

  if (provider !== "ollama") {
    return jsonError(
      400,
      "unsupported_provider",
      "Зараз підтримується тільки Ollama.",
    );
  }

  if (!question || !model || !Array.isArray(responses) || !responses.length) {
    return jsonError(400, "invalid_payload", "Некоректний payload.");
  }

  try {
    const result = await generateWithOllama({
      model,
      prompt: buildSynthesisPrompt({ question, mode, responses, format }),
    });

    const parsed = parseJsonObject(result.text);
    if (parsed?.synthesis) {
      return Response.json({
        ok: true,
        synthesis: parsed.synthesis,
        highlights: {
          agreements: Array.isArray(parsed?.highlights?.agreements)
            ? parsed.highlights.agreements
            : [],
          risks: Array.isArray(parsed?.highlights?.risks)
            ? parsed.highlights.risks
            : [],
          nextSteps: Array.isArray(parsed?.highlights?.nextSteps)
            ? parsed.highlights.nextSteps
            : [],
        },
      });
    }

    return Response.json({
      ok: true,
      synthesis: result.text,
      highlights: {
        agreements: [],
        risks: [],
        nextSteps: [],
      },
    });
  } catch (error) {
    const { code, message } = normalizeOllamaError(error, model);
    return jsonError(code === "timeout" ? 504 : 502, code, message);
  }
}
