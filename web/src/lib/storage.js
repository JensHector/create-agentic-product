// Session history persistence in localStorage so old scenarios can be replayed.

const KEY = 'pitchcoach.sessions.v1';

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const sessions = loadSessions();
  sessions.unshift(session); // newest first
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 100)));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
  return sessions;
}

export function deleteSession(id) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(sessions));
  return sessions;
}

export function newSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
