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

function parseFeedback(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      return {
        english_fluency: obj.english_fluency || [],
        pitch_logic: obj.pitch_logic || [],
        character_consistency: obj.character_consistency || [],
        executive_credibility: obj.executive_credibility || [],
        verdict: obj.verdict || '',
      };
    } catch { /* fall through */ }
  }
  return {
    english_fluency: [],
    pitch_logic: [],
    character_consistency: [],
    executive_credibility: [],
    verdict: '',
    raw: text,
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

  const { personaId, context, transcript } = body;
  const persona = getPersona(personaId);
  if (!persona) return json(400, { error: 'bad_request', message: 'Unknown persona.' });
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return json(400, { error: 'bad_request', message: 'transcript[] is required.' });
  }

  const convo = transcript
    .map((m) => `${m.role === 'user' ? 'PITCHER' : persona.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const system = `You are a blunt, experienced pitch coach reviewing a leadership consultant's
practice pitch to a ${persona.role}. Be honest and specific — no generic praise, no padding.
The pitcher is a non-native English speaker practising in English, so judge fluency fairly
but candidly.

Return ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{
  "english_fluency": ["bullet", ...],
  "pitch_logic": ["bullet", ...],
  "character_consistency": ["bullet", ...],
  "executive_credibility": ["bullet", ...],
  "verdict": "one snappy sentence: would this exec proceed?"
}
Rules: 3-4 short, punchy bullets total across the categories combined (not per category —
pick the categories that matter most and leave others as an empty array if there's nothing
sharp to say). Each bullet is one concrete, actionable observation tied to something that
actually happened in the transcript. Quote or paraphrase the pitcher when useful.
- english_fluency: confidence, pacing, articulation, word choice.
- pitch_logic: did they answer objections? earn credibility? or dodge?
- character_consistency: do they sound like they believe what they're saying?
- executive_credibility: would a skeptical exec actually want to proceed?`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [
        {
          role: 'user',
          content: `PITCH CONTEXT: ${context || 'general leadership pitch'}\n\nTRANSCRIPT:\n\n${convo}\n\nGive me the JSON feedback now.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return json(200, parseFeedback(text));
  } catch (err) {
    console.error('[anthropic error]', err?.status, err?.message);
    if (err instanceof Anthropic.AuthenticationError) {
      return json(401, { error: 'auth', message: 'The Anthropic API key is invalid.' });
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
