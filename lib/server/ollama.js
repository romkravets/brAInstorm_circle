const OLLAMA_BASE = "http://127.0.0.1:11434";

export function jsonError(status, error, message, extra = {}) {
  return Response.json({ ok: false, error, message, ...extra }, { status });
}

export function getParticipantModel(participant) {
  return participant?.model || participant?.ollamaModel || "";
}

export function normalizeOllamaError(error, model = "") {
  const code = error?.message || "ollama_unreachable";
  const modelHint = model ? ` ${model}` : "";

  const messages = {
    unsupported_provider: "Зараз підтримується тільки Ollama.",
    missing_params: "Не вказана модель або промпт.",
    invalid_payload: "Некоректний payload.",
    invalid_json: "Очікувався JSON body.",
    ollama_unreachable:
      "Ollama не запущений. Запусти: OLLAMA_ORIGINS=* ollama serve",
    model_not_found:
      `Модель не знайдена. Запусти: ollama pull${modelHint}`.trim(),
    ollama_error: "Помилка Ollama. Перевір чи запущений сервер.",
    timeout: "Модель відповідає занадто довго. Спробуй легшу модель.",
    no_runnable_participants:
      "Додай хоча б одного auto-учасника (Ollama або API).",
  };

  return {
    code,
    message: messages[code] || messages.ollama_unreachable,
  };
}

export async function fetchOllamaModels(timeoutMs = 2000) {
  const response = await fetch(`${OLLAMA_BASE}/api/tags`, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("ollama_unreachable");
  }

  const data = await response.json();
  return (data.models ?? []).map((item) => item.name);
}

export async function resolveOllamaModelName(requestedModel, timeoutMs = 2000) {
  if (!requestedModel) {
    throw new Error("missing_params");
  }

  const installedModels = await fetchOllamaModels(timeoutMs);
  if (installedModels.includes(requestedModel)) {
    return requestedModel;
  }

  const prefixMatch = installedModels.find((item) =>
    item.startsWith(`${requestedModel}:`),
  );
  if (prefixMatch) {
    return prefixMatch;
  }

  throw new Error("model_not_found");
}

export async function getDefaultOllamaModel(timeoutMs = 2000) {
  const installedModels = await fetchOllamaModels(timeoutMs);
  if (!installedModels.length) {
    throw new Error("model_not_found");
  }

  const preferredPrefixes = [
    "llama",
    "qwen",
    "gemma",
    "mistral",
    "phi",
    "deepseek",
  ];
  for (const prefix of preferredPrefixes) {
    const preferredModel = installedModels.find((item) =>
      item.startsWith(prefix),
    );
    if (preferredModel) {
      return preferredModel;
    }
  }

  return installedModels[0];
}

export async function generateWithOllama({
  model,
  prompt,
  temperature = 0.3,
  maxTokens = 1200,
  timeoutMs = 120000,
}) {
  if (!model || !prompt) {
    throw new Error("missing_params");
  }

  const resolvedModel = await resolveOllamaModelName(model, 3000);

  const startedAt = Date.now();

  let response;
  try {
    response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: resolvedModel,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error("timeout");
    }
    throw new Error("ollama_unreachable");
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("model_not_found");
    }
    throw new Error("ollama_error");
  }

  const data = await response.json();
  return {
    text: data.response ?? "",
    latencyMs: Date.now() - startedAt,
    model: resolvedModel,
  };
}

export function parseJsonObject(text) {
  if (!text || typeof text !== "string") return null;

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function serializeResponses(responses) {
  return responses
    .filter((item) => item?.text)
    .map((item) => `[${item.name}]:\n${item.text}`)
    .join("\n\n");
}

export function buildCrossCheckPrompt({ question, mode, responses }) {
  return [
    `Питання: ${question}`,
    `Режим: ${mode}`,
    "",
    "Порівняй відповіді учасників і поверни ТІЛЬКИ JSON без пояснень.",
    "Формат JSON:",
    "{",
    '  "agreements": ["..."],',
    '  "conflicts": ["..."],',
    '  "missing": ["..."]',
    "}",
    "",
    serializeResponses(responses),
  ].join("\n");
}

export function buildSynthesisPrompt({
  question,
  mode,
  responses,
  format = "decision_brief",
}) {
  return [
    `Питання: ${question}`,
    `Режим: ${mode}`,
    `Формат: ${format}`,
    "",
    "На основі відповідей учасників створи фінальну вижимку і поверни ТІЛЬКИ JSON без пояснень.",
    "Формат JSON:",
    "{",
    '  "synthesis": "...",',
    '  "highlights": {',
    '    "agreements": ["..."],',
    '    "risks": ["..."],',
    '    "nextSteps": ["..."]',
    "  }",
    "}",
    "",
    serializeResponses(responses),
  ].join("\n");
}
