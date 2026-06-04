import Anthropic from '@anthropic-ai/sdk';
import { getPersona } from './_personas.js';

const MODEL = process.env.MODEL || 'claude-sonnet-4-6';

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(401, {
      error: 'auth',
      message: 'No ANTHROPIC_API_KEY configured. Add it in the Netlify dashboard under Environment Variables.',
    });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad_request', message: 'Invalid JSON.' }); }

  const { personaId, context, messages, userTurns } = body;
  const persona = getPersona(personaId);
  if (!persona) return json(400, { error: 'bad_request', message: 'Unknown persona.' });
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: 'bad_request', message: 'messages[] is required.' });
  }

  const contextLine = context ? `\nPITCH CONTEXT: ${context}\n` : '\n';
  const turnHint =
    typeof userTurns === 'number' && userTurns < 5
      ? `\n(Internal note: only ${userTurns} user turn(s) so far — keep pressing, do NOT conclude or use [[END]] yet.)`
      : '';

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: persona.system + contextLine + turnHint,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const done = text.includes('[[END]]');
    const reply = text.replace(/\[\[END\]\]/g, '').trim();

    return json(200, { reply, done, stopReason: response.stop_reason });
  } catch (err) {
    console.error('[anthropic error]', err?.status, err?.message);
    if (err instanceof Anthropic.AuthenticationError) {
      return json(401, { error: 'auth', message: 'The Anthropic API key is invalid. Check the Netlify environment variable.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: 'rate_limit', message: 'Rate limited. Wait a moment and try again.' });
    }
    if (err instanceof Anthropic.APIError) {
      return json(err.status || 502, { error: 'api', message: err.message || 'The Anthropic API returned an error.' });
    }
    return json(500, { error: 'server', message: 'Unexpected server error.' });
  }
};
