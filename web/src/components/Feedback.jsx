import React from 'react';

const SECTIONS = [
  { key: 'english_fluency', label: 'English fluency', hint: 'confidence · pacing · articulation' },
  { key: 'pitch_logic', label: 'Pitch logic', hint: 'objections handled · credibility earned' },
  { key: 'character_consistency', label: 'Character consistency', hint: 'do you believe what you say?' },
  { key: 'executive_credibility', label: 'Executive credibility', hint: 'would they proceed?' },
];

export default function Feedback({ persona, context, feedback, loading, error, onRetry }) {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">Coach's debrief</h2>
      <p className="text-slate-500 mb-6">
        {persona.role} · {context}
      </p>

      {loading && (
        <div className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">
          Analysing your pitch…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-700">
          <p className="mb-3">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry analysis
          </button>
        </div>
      )}

      {feedback && !loading && (
        <div className="space-y-4">
          {feedback.verdict && (
            <div className="rounded-xl bg-slate-900 p-5 text-white shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Verdict</div>
              <div className="text-lg font-medium">{feedback.verdict}</div>
            </div>
          )}

          {feedback.raw ? (
            <div className="rounded-xl bg-white p-5 shadow-sm whitespace-pre-wrap text-slate-700">
              {feedback.raw}
            </div>
          ) : (
            SECTIONS.map((s) => {
              const items = feedback[s.key] || [];
              if (items.length === 0) return null;
              return (
                <div key={s.key} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{s.label}</h3>
                    <span className="text-xs text-slate-400">{s.hint}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((it, i) => (
                      <li key={i} className="flex gap-2 text-slate-700">
                        <span className="text-slate-400">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
