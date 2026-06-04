import React, { useEffect, useState } from 'react';
import ScenarioSelector from './components/ScenarioSelector.jsx';
import Conversation from './components/Conversation.jsx';
import Recorder from './components/Recorder.jsx';
import Feedback from './components/Feedback.jsx';
import History from './components/History.jsx';
import { getPersona, openingFor } from './personas.js';
import { isSpeechSupported } from './lib/speech.js';
import { sendTurn, requestFeedback, health } from './lib/api.js';
import { loadSessions, saveSession, deleteSession, newSessionId } from './lib/storage.js';

const MIN_USER_TURNS = 5;

export default function App() {
  const [view, setView] = useState('setup'); // setup | live | feedback | history | replay
  const [persona, setPersona] = useState(null);
  const [context, setContext] = useState('');
  const [messages, setMessages] = useState([]); // {role, content}
  const [thinking, setThinking] = useState(false);
  const [turnError, setTurnError] = useState('');
  const [done, setDone] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState('');

  const [sessions, setSessions] = useState([]);
  const [replaySession, setReplaySession] = useState(null);
  const [keyWarning, setKeyWarning] = useState('');

  useEffect(() => {
    setSessions(loadSessions());
    health().then((h) => {
      if (h && h.ok && !h.keyConfigured) {
        setKeyWarning('Server is running but no ANTHROPIC_API_KEY is set — add it to .env and restart the server.');
      } else if (!h || !h.ok) {
        setKeyWarning('Backend not reachable. Start it with: cd server && npm install && npm start');
      }
    });
  }, []);

  const userTurns = messages.filter((m) => m.role === 'user').length;

  function startSession({ personaId, context: ctx }) {
    const p = getPersona(personaId);
    setPersona(p);
    setContext(ctx);
    setMessages([{ role: 'assistant', content: openingFor(p, ctx) }]);
    setDone(false);
    setTurnError('');
    setFeedback(null);
    setView('live');
  }

  async function submitTurn(text) {
    setTurnError('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setThinking(true);
    try {
      const data = await sendTurn({
        personaId: persona.id,
        context,
        messages: next,
        userTurns: next.filter((m) => m.role === 'user').length,
      });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
      if (data.done) setDone(true);
    } catch (err) {
      setTurnError(err.message);
      // Roll back the user turn so they can retry without duplicating it.
      setMessages(messages);
    } finally {
      setThinking(false);
    }
  }

  async function endSession() {
    setView('feedback');
    setFbLoading(true);
    setFbError('');
    setFeedback(null);
    const transcript = messages;
    try {
      const fb = await requestFeedback({ personaId: persona.id, context, transcript });
      setFeedback(fb);
      persistSession(transcript, fb);
    } catch (err) {
      setFbError(err.message);
    } finally {
      setFbLoading(false);
    }
  }

  function retryFeedback() {
    endSession();
  }

  function persistSession(transcript, fb) {
    const session = {
      id: newSessionId(),
      createdAt: Date.now(),
      personaId: persona.id,
      context,
      transcript,
      feedback: fb,
    };
    setSessions(saveSession(session));
  }

  function reset() {
    setView('setup');
    setPersona(null);
    setMessages([]);
    setFeedback(null);
    setDone(false);
  }

  function replay(session) {
    setReplaySession(session);
    setView('replay');
  }

  function removeSession(id) {
    setSessions(deleteSession(id));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={reset} className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Pitch Coach<span className="text-rose-500"> Pro</span>
            </span>
          </button>
          <nav className="flex items-center gap-1 text-sm">
            <NavBtn active={view === 'setup'} onClick={reset}>
              New pitch
            </NavBtn>
            <NavBtn
              active={view === 'history' || view === 'replay'}
              onClick={() => setView('history')}
            >
              History
            </NavBtn>
          </nav>
        </div>
      </header>

      {keyWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          {keyWarning}
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {view === 'setup' && (
          <div className="px-4 py-8 w-full">
            <ScenarioSelector onStart={startSession} speechSupported={isSpeechSupported()} />
          </div>
        )}

        {view === 'live' && persona && (
          <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">{persona.role}</span> · {context}
              </div>
              <div className="text-xs text-slate-400">
                {userTurns}/{MIN_USER_TURNS}+ turns
              </div>
            </div>

            <Conversation persona={persona} messages={messages} thinking={thinking} />

            {turnError && (
              <div className="px-4 pb-1 text-sm text-rose-600">{turnError}</div>
            )}

            {done && (
              <div className="px-4 py-2 text-center text-sm text-slate-600 bg-emerald-50 border-t border-emerald-200">
                The executive has wrapped up. Ready for your debrief?
              </div>
            )}

            <Recorder onSubmit={submitTurn} disabled={thinking || done} />

            <div className="px-4 py-3 flex items-center justify-between">
              <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-600">
                Abandon
              </button>
              <button
                onClick={endSession}
                disabled={userTurns === 0}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  done
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                } disabled:opacity-40`}
              >
                {done ? 'See feedback →' : "We're done · End & get feedback"}
              </button>
            </div>
          </div>
        )}

        {view === 'feedback' && persona && (
          <div className="px-4 py-8 w-full">
            <Feedback
              persona={persona}
              context={context}
              feedback={feedback}
              loading={fbLoading}
              error={fbError}
              onRetry={retryFeedback}
            />
            <div className="max-w-3xl mx-auto mt-6 flex gap-3">
              <button
                onClick={reset}
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
              >
                New pitch
              </button>
              <button
                onClick={() => setView('history')}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50"
              >
                View history
              </button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="px-4 py-8 w-full">
            <History sessions={sessions} onReplay={replay} onDelete={removeSession} />
          </div>
        )}

        {view === 'replay' && replaySession && (
          <ReplayView
            session={replaySession}
            onBack={() => setView('history')}
          />
        )}
      </main>
    </div>
  );
}

function ReplayView({ session, onBack }) {
  const persona = getPersona(session.personaId);
  return (
    <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{persona?.role}</span> · {session.context}
        </div>
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">
          ← Back to history
        </button>
      </div>
      <Conversation persona={persona} messages={session.transcript} thinking={false} />
      {session.feedback && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-6">
          <Feedback
            persona={persona}
            context={session.context}
            feedback={session.feedback}
            loading={false}
            error=""
            onRetry={() => {}}
          />
        </div>
      )}
    </div>
  );
}

function NavBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 font-medium transition ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
