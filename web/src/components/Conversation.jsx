import React, { useEffect, useRef } from 'react';

// Renders the running transcript. persona is the display object.
export default function Conversation({ persona, messages, thinking }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((m, i) => (
        <Bubble key={i} role={m.role} persona={persona} text={m.content} />
      ))}
      {thinking && (
        <div className="flex gap-3">
          <Avatar persona={persona} />
          <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-slate-400 shadow-sm">
            <span className="inline-flex gap-1">
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function Bubble({ role, persona, text }) {
  const isUser = role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-3 text-white shadow-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar persona={persona} />
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-slate-800 shadow-sm whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}

function Avatar({ persona }) {
  return (
    <div
      className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${persona.accent} flex items-center justify-center text-white text-sm font-bold`}
    >
      {persona.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
    </div>
  );
}

function Dot({ delay = '0ms' }) {
  return (
    <span
      className="rec-dot inline-block h-2 w-2 rounded-full bg-slate-300"
      style={{ animationDelay: delay }}
    />
  );
}
