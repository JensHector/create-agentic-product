// Calls to the backend proxy. All errors are normalised to a thrown Error with
// a human-readable .message so the UI can surface them.

async function post(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running on port 8787?');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status}).`);
  }
  return data;
}

export function sendTurn({ personaId, context, messages, userTurns }) {
  return post('/api/chat', { personaId, context, messages, userTurns });
}

export function requestFeedback({ personaId, context, transcript }) {
  return post('/api/feedback', { personaId, context, transcript });
}

export async function health() {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch {
    return { ok: false };
  }
}
