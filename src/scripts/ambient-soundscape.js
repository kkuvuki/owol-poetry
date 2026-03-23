/**
 * Ambient Soundscape Module
 * Procedurally generated meditative background audio for itsowol.com
 * Uses Web Audio API — no audio files required.
 */

const DEFAULT_VOLUME = 0.15;
const FADE_IN_DURATION = 2;
const FADE_OUT_DURATION = 1;
const CHIME_MIN_INTERVAL = 8000;
const CHIME_MAX_INTERVAL = 15000;

/**
 * Creates and returns an ambient soundscape controller.
 * @returns {{ play: () => void, pause: () => void, setVolume: (v: number) => void, destroy: () => void }}
 */
export function initSoundscape() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Master gain — everything routes through here
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  let volume = DEFAULT_VOLUME;
  let muted = false;
  let playing = false;
  let chimeTimeout = null;
  let destroyed = false;

  // ── Ambient Pad: low sine with slow LFO ──────────────────────────

  const padOsc = ctx.createOscillator();
  padOsc.type = 'sine';
  padOsc.frequency.value = 85; // low drone

  const padGain = ctx.createGain();
  padGain.gain.value = 0.35;

  // LFO modulates pad frequency gently
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08; // very slow wobble

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 8; // subtle pitch drift of +/- 8 Hz

  lfo.connect(lfoGain);
  lfoGain.connect(padOsc.frequency);

  // Second harmonics layer for warmth
  const padOsc2 = ctx.createOscillator();
  padOsc2.type = 'sine';
  padOsc2.frequency.value = 170;

  const padGain2 = ctx.createGain();
  padGain2.gain.value = 0.12;

  padOsc2.connect(padGain2);
  padGain2.connect(masterGain);

  padOsc.connect(padGain);
  padGain.connect(masterGain);

  // ── Wind-like Noise: filtered white noise ────────────────────────

  const noiseBufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  const noiseBandpass = ctx.createBiquadFilter();
  noiseBandpass.type = 'bandpass';
  noiseBandpass.frequency.value = 600;
  noiseBandpass.Q.value = 0.8;

  // Slow sweep on the bandpass center frequency
  const noiseLfo = ctx.createOscillator();
  noiseLfo.type = 'sine';
  noiseLfo.frequency.value = 0.03;

  const noiseLfoGain = ctx.createGain();
  noiseLfoGain.gain.value = 200;

  noiseLfo.connect(noiseLfoGain);
  noiseLfoGain.connect(noiseBandpass.frequency);

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.08; // very quiet

  noiseNode.connect(noiseBandpass);
  noiseBandpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  // ── Start all continuous sources ─────────────────────────────────

  padOsc.start();
  padOsc2.start();
  lfo.start();
  noiseNode.start();
  noiseLfo.start();

  // ── Chime system ─────────────────────────────────────────────────

  function scheduleChime() {
    if (destroyed || !playing) return;

    const delay =
      CHIME_MIN_INTERVAL +
      Math.random() * (CHIME_MAX_INTERVAL - CHIME_MIN_INTERVAL);

    chimeTimeout = setTimeout(() => {
      if (destroyed || !playing) return;
      triggerChime();
      scheduleChime();
    }, delay);
  }

  function triggerChime() {
    // Pick a note from a pentatonic-ish set for a meditative feel
    const frequencies = [523, 659, 784, 880, 1047, 1175, 1319];
    const freq = frequencies[Math.floor(Math.random() * frequencies.length)];

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(masterGain);

    const now = ctx.currentTime;
    const peakVolume = 0.06 + Math.random() * 0.06; // 0.06 - 0.12
    const attackTime = 0.05;
    const decayTime = 1.5 + Math.random() * 1.5;

    // Envelope: quick attack, long exponential decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVolume, now + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);

    osc.start(now);
    osc.stop(now + attackTime + decayTime + 0.1);
  }

  // ── Controls ─────────────────────────────────────────────────────

  function play() {
    if (destroyed) return;
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;

    const target = muted ? 0 : volume;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(target, ctx.currentTime + FADE_IN_DURATION);

    scheduleChime();
  }

  function pause() {
    if (destroyed) return;
    playing = false;

    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_DURATION);

    if (chimeTimeout) {
      clearTimeout(chimeTimeout);
      chimeTimeout = null;
    }
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (playing && !muted) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
    }
  }

  function toggleMute() {
    muted = !muted;
    if (playing) {
      const target = muted ? 0 : volume;
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.15);
    }
    return muted;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    playing = false;

    if (chimeTimeout) {
      clearTimeout(chimeTimeout);
      chimeTimeout = null;
    }

    // Stop all oscillators
    [padOsc, padOsc2, lfo, noiseNode, noiseLfo].forEach((node) => {
      try { node.stop(); } catch (_) { /* already stopped */ }
    });

    ctx.close();
  }

  return {
    play,
    pause,
    setVolume,
    toggleMute,
    destroy,
    get volume() { return volume; },
    get muted() { return muted; },
    get playing() { return playing; },
  };
}
