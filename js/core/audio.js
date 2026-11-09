// Sonidos generados con WebAudio (sin archivos).
import { state } from './state.js';

let ctx = null;

function context() {
  if (state.muted) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone({ freq, to = freq, dur = 0.15, type = 'sine', gain = 0.07, delay = 0 }) {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.linearRampToValueAtTime(to, t0 + dur);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const audio = {
  // Debe llamarse desde un gesto del usuario para habilitar el audio.
  unlock() {
    context();
  },
  siren() {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 620, to: 940, dur: 0.38, type: 'sawtooth', gain: 0.04, delay: i * 0.76 });
      tone({ freq: 940, to: 620, dur: 0.38, type: 'sawtooth', gain: 0.04, delay: i * 0.76 + 0.38 });
    }
  },
  alert() {
    tone({ freq: 880, dur: 0.12, type: 'square', gain: 0.05 });
    tone({ freq: 880, dur: 0.12, type: 'square', gain: 0.05, delay: 0.18 });
  },
  dispatch() {
    tone({ freq: 440, to: 660, dur: 0.14, type: 'triangle' });
  },
  success() {
    tone({ freq: 523, dur: 0.12, type: 'triangle' });
    tone({ freq: 784, dur: 0.2, type: 'triangle', delay: 0.11 });
  },
  fail() {
    tone({ freq: 220, to: 110, dur: 0.4, type: 'sawtooth', gain: 0.05 });
  },
  rumble() {
    tone({ freq: 70, to: 38, dur: 0.9, type: 'sawtooth', gain: 0.12 });
  },
  click() {
    tone({ freq: 700, dur: 0.05, type: 'square', gain: 0.03 });
  },
};
