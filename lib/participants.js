export const AI_PRESETS = [
  // Cloud — manual copy-paste
  { name: 'Claude',     respondMode: 'manual', url: 'https://claude.ai/new',              ollamaModel: '', role: 'Аналітик' },
  { name: 'Gemini',     respondMode: 'manual', url: 'https://gemini.google.com',          ollamaModel: '', role: 'Аналітик' },
  { name: 'GPT-4o',     respondMode: 'manual', url: 'https://chatgpt.com',                ollamaModel: '', role: 'Аналітик' },
  { name: 'Mistral',    respondMode: 'manual', url: 'https://chat.mistral.ai',            ollamaModel: '', role: 'Аналітик' },
  { name: 'Perplexity', respondMode: 'manual', url: 'https://perplexity.ai',              ollamaModel: '', role: 'Аналітик' },
  { name: 'Grok',       respondMode: 'manual', url: 'https://grok.com',                   ollamaModel: '', role: 'Аналітик' },
  { name: 'DeepSeek',   respondMode: 'manual', url: 'https://chat.deepseek.com',          ollamaModel: '', role: 'Аналітик' },
  { name: 'Copilot',    respondMode: 'manual', url: 'https://copilot.microsoft.com',      ollamaModel: '', role: 'Аналітик' },
  // Local — Ollama
  { name: 'Llama 3.1',   respondMode: 'ollama', url: '', ollamaModel: 'llama3.1',     role: 'Аналітик' },
  { name: 'Mistral 7B',  respondMode: 'ollama', url: '', ollamaModel: 'mistral',      role: 'Аналітик' },
  { name: 'Gemma 2',     respondMode: 'ollama', url: '', ollamaModel: 'gemma2',       role: 'Аналітик' },
  { name: 'Qwen 2.5',    respondMode: 'ollama', url: '', ollamaModel: 'qwen2.5',      role: 'Аналітик' },
  { name: 'DeepSeek-R1', respondMode: 'ollama', url: '', ollamaModel: 'deepseek-r1',  role: 'Критик'   },
  { name: 'Phi-4',       respondMode: 'ollama', url: '', ollamaModel: 'phi4',         role: 'Аналітик' },
];

export const ROLES = ['Аналітик', 'Критик', 'Синтезатор', 'Адвокат диявола'];

export function isSafeUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost');
  } catch {
    return false;
  }
}
