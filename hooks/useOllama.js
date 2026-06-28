'use client';
import { useState, useCallback } from 'react';

const OLLAMA_BASE = 'http://localhost:11434';

export function useOllama() {
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | { running, models }

  const checkOllama = useCallback(async () => {
    try {
      const res  = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) { setOllamaStatus({ running: false, models: [] }); return; }
      const data = await res.json();
      setOllamaStatus({ running: true, models: (data.models ?? []).map(m => m.name) });
    } catch {
      setOllamaStatus({ running: false, models: [] });
    }
  }, []);

  const askOllama = useCallback(async (model, prompt, onChunk) => {
    if (!model || !prompt) throw new Error('missing_params');

    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const code = res.status;
      throw new Error(code === 404 ? 'model_not_found' : 'ollama_error');
    }

    const data = await res.json();
    return data.response ?? '';
  }, []);

  return { ollamaStatus, checkOllama, askOllama };
}

export const OLLAMA_ERRORS = {
  model_not_found:   (model) => `Модель не знайдена. Запусти: ollama pull ${model}`,
  ollama_error:      () => 'Помилка Ollama. Перевір чи запущений сервер.',
  missing_params:    () => 'Не вказана модель або промпт.',
  TimeoutError:      () => 'Модель відповідає занадто довго. Спробуй легшу модель.',
  default:           () => 'Ollama не запущений. Запусти: OLLAMA_ORIGINS=* ollama serve',
};

export function ollamaErrorMessage(error, model = '') {
  const key = error?.message ?? 'default';
  const fn  = OLLAMA_ERRORS[key] ?? OLLAMA_ERRORS.default;
  return fn(model);
}
