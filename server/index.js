import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import { getPersona } from './personas.js';

// Load .env from the project root (one level up from /server), per CLAUDE.md.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config(); // also honour a local .env / real env vars

const PORT = process.env.PORT || 8787;

// The user asked for "Claude Sonnet 4". That is the model id below. To use the
// current Sonnet instead, set MODEL=claude-sonnet-4-6 in .env.
const MODEL = process.env.MODEL || 'claude-sonnet-4-20250514';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Turn the SDK's typed errors into clean JSON the frontend can show the user.
function sendApiError(res, err) {
  console.error('[anthropic error]', err?.status, err?.message);
  if (err instanceof Anthropic.AuthenticationError) {
    return res.status(401).json({
      error: 'auth',
      message: 'The Anthropic API key is missing or invalid. Check ANTHROPIC_API_KEY in .env.',
    });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({
      error: 'rate_limit',
      message: 'Rate limited by the Anthropic API. Wait a moment and try again.',
    });
  }
  if (err instanceof Anthropic.APIError) {
    return res.status(err.status || 502).json({
      error: 'api',
      message: err.message || 'The Anthropic API returned an error.',
    });
  }
  return res.status(500).json({
    error: 'server',
    message: 'Unexpected server error. See the server logs for details.',
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: Boolean(apiKey) });
});

// --- Live pitch turn -------------------------------------------------------
// Body: { personaId, context, messages: [{role:'user'|'assistant', content}], userTurns }
app.post('/api/chat', async (req, res) => {
  if (!client) {
    return res.status(401).json({
      error: 'auth',
      message: 'No ANTHROPIC_API_KEY configured on the server. Add it to .env and restart.',
    });
  }

  const { personaId, context, messages, userTurns } = req.body || {};
  const persona = getPersona(personaId);
  if (!persona) return res.status(400).json({ error: 'bad_request', message: 'Unknown persona.' });
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'bad_request', message: 'messages[] is required.' });
  }

  const contextLine = context ? `\nPITCH CONTEXT: ${context}\n` : '\n';
  const turnHint =
    typeof userTurns === 'number' && userTurns < 5
      ? `\n(Internal note: only ${userTurns} user turn(s) so far — keep pressing, do NOT conclude or use [[END]] yet.)`
      : '';

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

    res.json({ reply, done, stopReason: response.stop_reason });
  } catch (err) {
    sendApiError(res, err);
  }
});

// --- Post-session feedback -------------------------------------------------
// Body: { personaId, context, transcript: [{role, content}] }
app.post('/api/feedback', async (req, res) => {
  if (!client) {
    return res.status(401).json({
      error: 'auth',
      message: 'No ANTHROPIC_API_KEY configured on the server. Add it to .env and restart.',
    });
  }

  const { personaId, context, transcript } = req.body || {};
  const persona = getPersona(personaId);
  if (!persona) return res.status(400).json({ error: 'bad_request', message: 'Unknown persona.' });
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'bad_request', message: 'transcript[] is required.' });
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

    res.json(parseFeedback(text));
  } catch (err) {
    sendApiError(res, err);
  }
});

// Robustly pull JSON out of the model's reply, with a readable fallback.
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
    } catch {
      /* fall through */
    }
  }
  // Fallback: hand back the raw text so the user still sees something useful.
  return {
    english_fluency: [],
    pitch_logic: [],
    character_consistency: [],
    executive_credibility: [],
    verdict: '',
    raw: text,
  };
}

app.listen(PORT, () => {
  console.log(`Pitch Coach Pro server on http://localhost:${PORT} (model: ${MODEL}, key: ${apiKey ? 'set' : 'MISSING'})`);
});
