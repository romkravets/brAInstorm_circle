import {
  fetchOllamaModels,
  jsonError,
  normalizeOllamaError,
} from "../../../../lib/server/ollama.js";

export async function GET() {
  try {
    const models = await fetchOllamaModels();
    return Response.json({ ok: true, running: true, models });
  } catch (error) {
    const { code, message } = normalizeOllamaError(error);
    return jsonError(503, code, message, { running: false, models: [] });
  }
}
