"use client";
import { useCallback, useState } from "react";

export function useOllama() {
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | { running, models }

  const checkOllama = useCallback(async () => {
    try {
      const res = await fetch("/api/health/ollama", {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) {
        setOllamaStatus({ running: false, models: [] });
        return;
      }
      const data = await res.json();
      setOllamaStatus({
        running: true,
        models: data.models ?? [],
      });
    } catch {
      setOllamaStatus({ running: false, models: [] });
    }
  }, []);

  const askOllama = useCallback(async (model, prompt) => {
    if (!model || !prompt) throw new Error("missing_params");

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "ollama", model, prompt }),
      signal: AbortSignal.timeout(120_000),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "ollama_error");
    }

    return data.text ?? "";
  }, []);

  return { ollamaStatus, checkOllama, askOllama };
}

export const OLLAMA_ERRORS = {
  model_not_found: (model) =>
    `Модель не знайдена. Запусти: ollama pull ${model}`,
  ollama_error: () => "Помилка Ollama. Перевір чи запущений сервер.",
  missing_params: () => "Не вказана модель або промпт.",
  TimeoutError: () => "Модель відповідає занадто довго. Спробуй легшу модель.",
  default: () => "Ollama не запущений. Запусти: OLLAMA_ORIGINS=* ollama serve",
};

export function ollamaErrorMessage(error, model = "") {
  const key = error?.message ?? "default";
  const fn = OLLAMA_ERRORS[key] ?? OLLAMA_ERRORS.default;
  return fn(model);
}
