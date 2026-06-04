# Pitch Coach Pro

A speech-driven pitch-practice app for leadership consultant **Jens Hector**. You
speak an English pitch out loud; an AI executive persona pushes back in real time,
switching tactics based on what you emphasize. After 5–7 exchanges the session
ends and you get a short, honest coaching debrief.

## How it works

```
Browser (React + Vite)            Backend proxy (Node/Express)        Anthropic
  Web Speech API  ── speech ──▶ transcript                            Claude
  /api/chat ───────────────────▶ holds ANTHROPIC_API_KEY ───────────▶ Sonnet 4
  /api/feedback ───────────────▶  (key never reaches the browser)  ◀──
  localStorage (session history)
```

The API key lives only on the server. The browser talks to `/api/*`, which Vite
proxies to the backend in dev. This avoids exposing the key and sidesteps CORS.

## Features

- **Speech-to-text**: Web Speech API transcribes your spoken pitch live (Chrome/Edge).
  Typing works as a fallback in any browser.
- **3 executive personas**: Skeptical Hotel Director (primary), CFO, HR Manager —
  each with a distinct system-prompt "brain" that interrupts, pushes back, and
  asks pointed follow-ups.
- **Adaptive tactics**: if you lean on ROI, they drill into the metrics; if you
  lean on culture, they drill into change management; if you repeat yourself, they
  escalate.
- **Natural length**: the persona keeps pressing for at least 5–7 exchanges and
  only wraps up when you've handled the objections or you say you're done.
- **Honest feedback**: a coach debrief scoring English fluency, pitch logic,
  character consistency, and executive credibility — 3–4 punchy, specific bullets,
  not generic praise.
- **Session history**: every finished session is saved to localStorage; replay old
  scenarios with their transcript and feedback.

## Setup

You need Node 18+ and an Anthropic API key.

### 1. Add your API key

```bash
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start the backend

```bash
cd server
npm install
npm start          # http://localhost:8787
```

### 3. Start the frontend (separate terminal)

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Open http://localhost:5173 in **Chrome or Edge** (for speech input).

## Model

Defaults to `claude-sonnet-4-20250514` (Claude Sonnet 4, as specified). To use the
current Sonnet instead, set `MODEL=claude-sonnet-4-6` in `.env` and restart the server.

## Usage

1. Pick a persona and pitch context, then **Start pitch**.
2. The executive opens with a question. Click **Record**, speak your pitch in
   English, watch it transcribe, then **Submit**.
3. They push back. Keep going — aim for 5–7 exchanges.
4. End when either you or the executive says you're done → read your debrief.
5. Find past runs under **History** and replay them anytime.

## Project layout

```
server/          Express proxy + persona system prompts + Claude calls
  index.js       /api/chat, /api/feedback, /api/health
  personas.js    The executive "brains" (never sent to the browser)
web/             React + Vite + Tailwind frontend
  src/
    App.jsx              State machine: setup → live → feedback → history/replay
    personas.js          Display metadata + opening lines
    lib/speech.js        Web Speech API wrapper
    lib/api.js           Backend calls with friendly error handling
    lib/storage.js       localStorage session history
    components/          ScenarioSelector, Recorder, Conversation, Feedback, History
```
