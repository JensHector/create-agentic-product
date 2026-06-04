// Thin wrapper around the Web Speech API (SpeechRecognition).
// Chrome / Edge expose it as webkitSpeechRecognition. Firefox / Safari do not
// support continuous dictation reliably, so we detect and report that.

export function isSpeechSupported() {
  return (
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export function createRecognizer({ onInterim, onFinal, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const recognition = new SR();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += chunk;
      else interim += chunk;
    }
    if (final && onFinal) onFinal(final);
    if (interim && onInterim) onInterim(interim);
  };

  recognition.onerror = (e) => {
    if (onError) onError(e.error || 'speech-error');
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}
