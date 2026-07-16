const SESSION_KEY = "bc_session_current";
const INDEX_KEY = "bc_sessions_index";
const VERSION = "2.1";
const COMPATIBLE_VERSIONS = new Set(["2.0", "2.1"]);

export function saveSession(session) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ version: VERSION, session }),
    );
    const index = loadIndex();
    const entry = {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      participantCount: session.participants.length,
      roundCount: session.rounds.length,
    };
    const updated = [entry, ...index.filter((e) => e.id !== session.id)].slice(
      0,
      10,
    );
    localStorage.setItem(INDEX_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("BC: save failed", e);
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!COMPATIBLE_VERSIONS.has(parsed?.version)) return null;
    return parsed.session ?? null;
  } catch {
    return null;
  }
}

export function loadIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
