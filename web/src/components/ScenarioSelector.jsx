import React, { useState } from 'react';
import { PERSONAS, CONTEXTS } from '../personas.js';

export default function ScenarioSelector({ onStart, speechSupported }) {
  const [personaId, setPersonaId] = useState(PERSONAS[0].id);
  const [context, setContext] = useState(CONTEXTS[0]);
  const [custom, setCustom] = useState('');

  const chosenContext = custom.trim() || context;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">Set up your pitch</h2>
      <p className="text-slate-500 mb-6">
        Pick who you're pitching to and what you're pitching. Then speak your pitch — they'll push back.
      </p>

      {!speechSupported && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Speech recognition isn't available in this browser. Use <strong>Chrome</strong> or{' '}
          <strong>Edge</strong> for voice input — you can still type your turns as a fallback.
        </div>
      )}

      <div className="space-y-3 mb-6">
        {PERSONAS.map((p) => {
          const active = p.id === personaId;
          return (
            <button
              key={p.id}
              onClick={() => setPersonaId(p.id)}
              className={`w-full text-left rounded-xl border-2 p-4 transition ${
                active
                  ? 'border-slate-900 bg-white shadow-sm'
                  : 'border-transparent bg-white/60 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${p.accent} flex items-center justify-center text-white font-bold`}
                >
                  {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {p.role}{' '}
                    <span className="font-normal text-slate-400">· {p.name}</span>
                  </div>
                  <div className="text-sm text-slate-500">{p.blurb}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <label className="block text-sm font-medium text-slate-700 mb-1">Pitch context</label>
      <select
        value={context}
        onChange={(e) => setContext(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 mb-2 focus:border-slate-900 focus:outline-none"
      >
        {CONTEXTS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="…or type your own context"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 mb-6 focus:border-slate-900 focus:outline-none"
      />

      <button
        onClick={() => onStart({ personaId, context: chosenContext })}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 transition"
      >
        Start pitch →
      </button>
    </div>
  );
}
