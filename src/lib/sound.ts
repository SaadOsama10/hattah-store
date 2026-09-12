"use client";

export const SOUND_MUTED_KEY = "hattah-sound-muted";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOUND_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(SOUND_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
}

let clickNoiseBuffer: AudioBuffer | null = null;

/** A short burst of white noise, reused across calls (built once, cheap
 * to reuse) — the raw material for a non-tonal, textural "tap" transient
 * rather than a musical note. */
function getClickNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (clickNoiseBuffer) return clickNoiseBuffer;
  const duration = 0.05;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  clickNoiseBuffer = buffer;
  return buffer;
}

/** A very short, clean digital tap — like a light touch on glass, not a
 * musical note: a filtered noise transient (percussive, no pitch), no
 * reverb, no harmonic layering, under 50ms total. */
export function playClick(): void {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = getClickNoiseBuffer(ctx);

  const tone = ctx.createBiquadFilter();
  tone.type = "bandpass";
  tone.frequency.value = 4200;
  tone.Q.value = 2.2;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.05, now);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

  noise.connect(tone);
  tone.connect(envelope);
  envelope.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.05);
}
