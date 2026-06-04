import React, { useEffect, useRef, useState } from 'react';
import { createRecognizer, isSpeechSupported } from '../lib/speech.js';

// Captures one spoken (or typed) pitch turn. Shows live transcription, then the
// user submits it. `disabled` blocks input while the executive is "thinking".
export default function Recorder({ onSubmit, disabled }) {
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognizerRef = useRef(null);
  const supported = isSpeechSupported();

  // Keep the latest final text in a ref so onend handlers see current value.
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  function start() {
    setError('');
    const rec = createRecognizer({
      onFinal: (t) => setFinalText((prev) => (prev ? prev + ' ' : '') + t.trim()),
      onInterim: (t) => setInterim(t),
      onError: (e) => {
        if (e === 'no-speech') return; // benign
        if (e === 'not-allowed') setError('Microphone permission denied. Allow mic access and retry.');
        else setError(`Speech error: ${e}`);
        setRecording(false);
      },
      onEnd: () => {
        setInterim('');
        setRecording(false);
      },
    });
    if (!rec) {
      setError('Speech recognition not available.');
      return;
    }
    recognizerRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setError('Could not start the microphone.');
    }
  }

  function stop() {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setRecording(false);
  }

  function submit() {
    const text = (finalText + ' ' + interim).trim();
    if (!text) return;
    stop();
    onSubmit(text);
    setFinalText('');
    setInterim('');
  }

  const liveText = (finalText + (interim ? ' ' + interim : '')).trim();

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {error && <div className="mb-2 text-sm text-rose-600">{error}</div>}

      <textarea
        value={liveText}
        onChange={(e) => {
          setFinalText(e.target.value);
          setInterim('');
        }}
        disabled={disabled}
        placeholder={
          supported
            ? 'Click Record and speak your pitch — or type here…'
            : 'Type your pitch turn here…'
        }
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-900 focus:outline-none disabled:bg-slate-50"
      />

      <div className="mt-3 flex items-center gap-3">
        {supported &&
          (recording ? (
            <button
              onClick={stop}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700"
            >
              <span className="rec-dot inline-block h-2.5 w-2.5 rounded-full bg-white" />
              Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={disabled}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
              Record
            </button>
          ))}

        <button
          onClick={submit}
          disabled={disabled || !liveText}
          className="ml-auto rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Submit →
        </button>
      </div>
    </div>
  );
}
