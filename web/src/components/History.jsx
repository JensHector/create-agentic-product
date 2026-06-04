import React from 'react';
import { getPersona } from '../personas.js';

export default function History({ sessions, onReplay, onDelete }) {
  if (sessions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center text-slate-500 py-12">
        No saved sessions yet. Finish a pitch and it'll show up here for replay.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Past sessions</h2>
      <div className="space-y-3">
        {sessions.map((s) => {
          const persona = getPersona(s.personaId);
          const userTurns = s.transcript.filter((m) => m.role === 'user').length;
          return (
            <div key={s.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${
                    persona?.accent || 'from-slate-400 to-slate-600'
                  } flex items-center justify-center text-white text-sm font-bold`}
                >
                  {(persona?.name || '??')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">
                    {persona?.role || 'Unknown persona'}
                  </div>
                  <div className="text-sm text-slate-500 truncate">{s.context}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(s.createdAt).toLocaleString()} · {userTurns} turns
                    {s.feedback?.verdict ? ` · ${s.feedback.verdict}` : ''}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onReplay(s)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Replay
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
