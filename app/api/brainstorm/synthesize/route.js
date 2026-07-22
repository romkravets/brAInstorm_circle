import {
  buildSynthesisPrompt,
  generateWithOllama,
  getDefaultOllamaModel,
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

  if (!question || !Array.isArray(responses) || !responses.length) {
    return jsonError(400, "invalid_payload", "Некоректний payload.");
  }

  let synthesisModel = model;

  if (!synthesisModel) {
    try {
      synthesisModel = await getDefaultOllamaModel();
    } catch (error) {
      const { code, message } = normalizeOllamaError(error);
      return jsonError(502, code, message);
    }
  }

  try {
    const result = await generateWithOllama({
      model: synthesisModel,
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
    if (error?.message === "model_not_found") {
      try {
        const fallbackModel = await getDefaultOllamaModel();
        const fallbackResult = await generateWithOllama({
          model: fallbackModel,
          prompt: buildSynthesisPrompt({ question, mode, responses, format }),
        });
        const parsed = parseJsonObject(fallbackResult.text);

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
          synthesis: fallbackResult.text,
          highlights: {
            agreements: [],
            risks: [],
            nextSteps: [],
          },
        });
      } catch (fallbackError) {
        const { code, message } = normalizeOllamaError(
          fallbackError,
          synthesisModel,
        );
        return jsonError(code === "timeout" ? 504 : 502, code, message);
      }
    }

    const { code, message } = normalizeOllamaError(error, synthesisModel);
    return jsonError(code === "timeout" ? 504 : 502, code, message);
  }
}
