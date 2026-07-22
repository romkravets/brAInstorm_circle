import {
  generateWithOllama,
  jsonError,
  normalizeOllamaError,
} from "../../../../lib/server/ollama.js";

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Очікувався JSON body.");
  }

  const {
    provider = "ollama",
    model,
    prompt,
    temperature = 0.3,
    maxTokens = 1200,
    timeoutMs = 120000,
  } = payload ?? {};

  if (provider !== "ollama") {
    return jsonError(
      400,
      "unsupported_provider",
      "Зараз підтримується тільки Ollama.",
    );
  }

  try {
    const result = await generateWithOllama({
      model,
      prompt,
      temperature,
      maxTokens,
      timeoutMs,
    });

    return Response.json({
      ok: true,
      text: result.text,
      latencyMs: result.latencyMs,
      usage: { inputTokens: 0, outputTokens: 0 },
      provider,
      model,
    });
  } catch (error) {
    const { code, message } = normalizeOllamaError(error, model);
    return jsonError(code === "timeout" ? 504 : 502, code, message);
  }
}
