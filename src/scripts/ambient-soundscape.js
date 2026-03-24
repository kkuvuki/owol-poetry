/**
 * Ambient Soundscape Module
 * Procedurally generated meditative background audio for itsowol.com
 * Uses Web Audio API — no audio files required.
 *
 * Reactive to poem mood data: the soundscape shifts character based on
 * the poem's emotional journey. Textures evolve over time for variety.
 */

const DEFAULT_VOLUME = 0.15;
const FADE_IN_DURATION = 2;
const FADE_OUT_DURATION = 1;

// Mood-mapped sound profiles
const MOOD_PROFILES = {
  Euphoric: {
    droneFreq: 130,       // higher, brighter
    droneDetune: 5,
    harmonic: 260,
    harmonicGain: 0.18,
    noiseCenter: 1200,
    noiseGain: 0.04,
    noiseQ: 0.5,
    chimeScale: [523, 659, 784, 1047, 1319, 1568, 1760], // C major bright
    chimeInterval: [4000, 8000],
    chimeVolume: [0.08, 0.14],
    chimeDecay: [1.0, 2.0],
    lfoRate: 0.12,
    lfoPitch: 6,
    color: 'golden',
  },
  Radiant: {
    droneFreq: 110,
    droneDetune: 3,
    harmonic: 220,
    harmonicGain: 0.15,
    noiseCenter: 900,
    noiseGain: 0.05,
    noiseQ: 0.6,
    chimeScale: [523, 659, 784, 880, 1047, 1175], // warm pentatonic
    chimeInterval: [6000, 12000],
    chimeVolume: [0.06, 0.12],
    chimeDecay: [1.5, 2.5],
    lfoRate: 0.08,
    lfoPitch: 8,
    color: 'amber',
  },
  Hopeful: {
    droneFreq: 98,
    droneDetune: 2,
    harmonic: 196,
    harmonicGain: 0.13,
    noiseCenter: 800,
    noiseGain: 0.06,
    noiseQ: 0.7,
    chimeScale: [392, 523, 587, 784, 880, 1047], // G major
    chimeInterval: [7000, 14000],
    chimeVolume: [0.05, 0.10],
    chimeDecay: [1.5, 3.0],
    lfoRate: 0.07,
    lfoPitch: 8,
    color: 'green',
  },
  Tender: {
    droneFreq: 92,
    droneDetune: 2,
    harmonic: 184,
    harmonicGain: 0.10,
    noiseCenter: 700,
    noiseGain: 0.06,
    noiseQ: 0.8,
    chimeScale: [440, 523, 659, 784, 880], // A minor gentle
    chimeInterval: [8000, 16000],
    chimeVolume: [0.04, 0.09],
    chimeDecay: [2.0, 3.5],
    lfoRate: 0.05,
    lfoPitch: 6,
    color: 'teal',
  },
  Contemplative: {
    droneFreq: 85,
    droneDetune: 0,
    harmonic: 170,
    harmonicGain: 0.12,
    noiseCenter: 600,
    noiseGain: 0.08,
    noiseQ: 0.8,
    chimeScale: [523, 659, 784, 880, 1047, 1175, 1319], // neutral pentatonic
    chimeInterval: [8000, 15000],
    chimeVolume: [0.06, 0.12],
    chimeDecay: [1.5, 3.0],
    lfoRate: 0.08,
    lfoPitch: 8,
    color: 'grey',
  },
  Wistful: {
    droneFreq: 82,
    droneDetune: -3,
    harmonic: 164,
    harmonicGain: 0.10,
    noiseCenter: 500,
    noiseGain: 0.09,
    noiseQ: 0.9,
    chimeScale: [392, 466, 523, 622, 698, 784], // Eb major (bittersweet)
    chimeInterval: [9000, 18000],
    chimeVolume: [0.04, 0.08],
    chimeDecay: [2.5, 4.0],
    lfoRate: 0.05,
    lfoPitch: 10,
    color: 'blue-light',
  },
  Melancholy: {
    droneFreq: 73,
    droneDetune: -5,
    harmonic: 146,
    harmonicGain: 0.08,
    noiseCenter: 400,
    noiseGain: 0.10,
    noiseQ: 1.0,
    chimeScale: [349, 415, 523, 622, 698], // F minor
    chimeInterval: [10000, 20000],
    chimeVolume: [0.03, 0.07],
    chimeDecay: [3.0, 5.0],
    lfoRate: 0.04,
    lfoPitch: 12,
    color: 'blue',
  },
  Anguished: {
    droneFreq: 65,
    droneDetune: -8,
    harmonic: 130,
    harmonicGain: 0.06,
    noiseCenter: 300,
    noiseGain: 0.12,
    noiseQ: 1.2,
    chimeScale: [311, 370, 415, 466, 554], // Eb minor, dissonant
    chimeInterval: [12000, 25000],
    chimeVolume: [0.03, 0.06],
    chimeDecay: [3.5, 6.0],
    lfoRate: 0.03,
    lfoPitch: 15,
    color: 'purple',
  },
  Desolate: {
    droneFreq: 55,
    droneDetune: -12,
    harmonic: 110,
    harmonicGain: 0.04,
    noiseCenter: 200,
    noiseGain: 0.14,
    noiseQ: 1.5,
    chimeScale: [233, 277, 311, 370, 415], // Bb minor, very low
    chimeInterval: [15000, 30000],
    chimeVolume: [0.02, 0.05],
    chimeDecay: [4.0, 7.0],
    lfoRate: 0.02,
    lfoPitch: 18,
    color: 'dark-purple',
  },
};

// Texture layers that fade in/out over time
const TEXTURES = {
  rain: {
    noiseType: 'highpass',
    freq: 3000,
    Q: 0.3,
    gain: 0.04,
    lfoRate: 0.15,
    lfoDepth: 800,
  },
  ocean: {
    noiseType: 'lowpass',
    freq: 300,
    Q: 0.5,
    gain: 0.06,
    lfoRate: 0.07,
    lfoDepth: 100,
  },
  heartbeat: {
    freq: 55,
    rate: 1.1, // ~66 BPM
    gain: 0.05,
  },
  bells: {
    freqs: [1397, 1760, 2093, 2637],
    gain: 0.03,
    interval: [12000, 25000],
    decay: [4.0, 8.0],
  },
};

const TEXTURE_CYCLE_MIN = 30000;  // minimum 30s per texture
const TEXTURE_CYCLE_MAX = 60000;  // maximum 60s per texture

/**
 * Creates and returns a mood-reactive ambient soundscape controller.
 * @param {Array} [moodData] — array of { mood, score, color } from generateMoodData()
 * @returns controller object
 */
export function initSoundscape(moodData) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  let volume = DEFAULT_VOLUME;
  let muted = false;
  let playing = false;
  let destroyed = false;
  let chimeTimeout = null;
  let textureTimeout = null;
  let heartbeatInterval = null;
  let activeTexture = null;
  let activeTextureNodes = [];

  // Determine the dominant mood from mood data
  let currentProfile = MOOD_PROFILES.Contemplative;
  let moodSequence = [];
  let moodIndex = 0;
  let moodShiftInterval = null;

  if (moodData && moodData.length > 0) {
    // Build a sequence of moods from the poem for reactive shifting
    moodSequence = moodData.map(d => d.mood);

    // Start with the poem's overall dominant mood
    const counts = {};
    moodSequence.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
    let dominant = 'Contemplative';
    let maxCount = 0;
    for (const [mood, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; dominant = mood; }
    }
    currentProfile = MOOD_PROFILES[dominant] || MOOD_PROFILES.Contemplative;
  }

  // ── Ambient Drone Pad ──────────────────────────────────────────

  const padOsc = ctx.createOscillator();
  padOsc.type = 'sine';
  padOsc.frequency.value = currentProfile.droneFreq;
  padOsc.detune.value = currentProfile.droneDetune;

  const padGain = ctx.createGain();
  padGain.gain.value = 0.35;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = currentProfile.lfoRate;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = currentProfile.lfoPitch;

  lfo.connect(lfoGain);
  lfoGain.connect(padOsc.frequency);

  // Second harmonic
  const padOsc2 = ctx.createOscillator();
  padOsc2.type = 'sine';
  padOsc2.frequency.value = currentProfile.harmonic;

  const padGain2 = ctx.createGain();
  padGain2.gain.value = currentProfile.harmonicGain;

  // Third voice — triangle for warmth
  const padOsc3 = ctx.createOscillator();
  padOsc3.type = 'triangle';
  padOsc3.frequency.value = currentProfile.droneFreq * 1.5; // fifth
  padOsc3.detune.value = currentProfile.droneDetune + 2;

  const padGain3 = ctx.createGain();
  padGain3.gain.value = 0.06;

  padOsc.connect(padGain);
  padGain.connect(masterGain);
  padOsc2.connect(padGain2);
  padGain2.connect(masterGain);
  padOsc3.connect(padGain3);
  padGain3.connect(masterGain);

  // ── Wind/Breath Noise ──────────────────────────────────────────

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
  noiseBandpass.frequency.value = currentProfile.noiseCenter;
  noiseBandpass.Q.value = currentProfile.noiseQ;

  const noiseLfo = ctx.createOscillator();
  noiseLfo.type = 'sine';
  noiseLfo.frequency.value = 0.03;

  const noiseLfoGain = ctx.createGain();
  noiseLfoGain.gain.value = 200;

  noiseLfo.connect(noiseLfoGain);
  noiseLfoGain.connect(noiseBandpass.frequency);

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = currentProfile.noiseGain;

  noiseNode.connect(noiseBandpass);
  noiseBandpass.connect(noiseGain);
  noiseGain.connect(masterGain);

  // ── Start continuous sources ───────────────────────────────────

  padOsc.start();
  padOsc2.start();
  padOsc3.start();
  lfo.start();
  noiseNode.start();
  noiseLfo.start();

  // ── Mood Transition ────────────────────────────────────────────

  function transitionToMood(mood) {
    const profile = MOOD_PROFILES[mood];
    if (!profile) return;
    currentProfile = profile;

    const t = ctx.currentTime;
    const dur = 4; // 4-second crossfade

    // Drone
    padOsc.frequency.linearRampToValueAtTime(profile.droneFreq, t + dur);
    padOsc.detune.linearRampToValueAtTime(profile.droneDetune, t + dur);

    // Harmonic
    padOsc2.frequency.linearRampToValueAtTime(profile.harmonic, t + dur);
    padGain2.gain.linearRampToValueAtTime(profile.harmonicGain, t + dur);

    // Fifth voice
    padOsc3.frequency.linearRampToValueAtTime(profile.droneFreq * 1.5, t + dur);

    // LFO
    lfo.frequency.linearRampToValueAtTime(profile.lfoRate, t + dur);
    lfoGain.gain.linearRampToValueAtTime(profile.lfoPitch, t + dur);

    // Noise
    noiseBandpass.frequency.linearRampToValueAtTime(profile.noiseCenter, t + dur);
    noiseBandpass.Q.linearRampToValueAtTime(profile.noiseQ, t + dur);
    noiseGain.gain.linearRampToValueAtTime(profile.noiseGain, t + dur);
  }

  // Walk through the poem's mood sequence over time
  function startMoodWalk() {
    if (!moodSequence.length || moodSequence.length < 2) return;

    // Shift mood every 15-25 seconds, walking through the poem
    function nextMood() {
      if (destroyed || !playing) return;
      moodIndex = (moodIndex + 1) % moodSequence.length;
      transitionToMood(moodSequence[moodIndex]);
      moodShiftInterval = setTimeout(nextMood, 15000 + Math.random() * 10000);
    }

    moodShiftInterval = setTimeout(nextMood, 15000 + Math.random() * 10000);
  }

  function stopMoodWalk() {
    if (moodShiftInterval) {
      clearTimeout(moodShiftInterval);
      moodShiftInterval = null;
    }
  }

  // ── Chime System ───────────────────────────────────────────────

  function scheduleChime() {
    if (destroyed || !playing) return;

    const [minI, maxI] = currentProfile.chimeInterval;
    const delay = minI + Math.random() * (maxI - minI);

    chimeTimeout = setTimeout(() => {
      if (destroyed || !playing) return;
      triggerChime();
      scheduleChime();
    }, delay);
  }

  function triggerChime() {
    const scale = currentProfile.chimeScale;
    const freq = scale[Math.floor(Math.random() * scale.length)];

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Sometimes add a second voice slightly detuned for shimmer
    const shimmer = Math.random() > 0.6;
    let osc2 = null;
    let gain2 = null;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(masterGain);

    if (shimmer) {
      osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.002; // slight detune
      gain2 = ctx.createGain();
      gain2.gain.value = 0;
      osc2.connect(gain2);
      gain2.connect(masterGain);
    }

    const now = ctx.currentTime;
    const [minVol, maxVol] = currentProfile.chimeVolume;
    const peakVolume = minVol + Math.random() * (maxVol - minVol);
    const attackTime = 0.05;
    const [minDecay, maxDecay] = currentProfile.chimeDecay;
    const decayTime = minDecay + Math.random() * (maxDecay - minDecay);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVolume, now + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);

    osc.start(now);
    osc.stop(now + attackTime + decayTime + 0.1);

    if (shimmer && osc2 && gain2) {
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(peakVolume * 0.5, now + attackTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);
      osc2.start(now);
      osc2.stop(now + attackTime + decayTime + 0.1);
    }
  }

  // ── Texture System ─────────────────────────────────────────────

  function startTextureCycle() {
    if (destroyed || !playing) return;

    const textureNames = Object.keys(TEXTURES);
    function cycleTexture() {
      if (destroyed || !playing) return;

      // Fade out old texture
      fadeOutTexture();

      // Pick a random texture (different from current if possible)
      let next;
      do {
        next = textureNames[Math.floor(Math.random() * textureNames.length)];
      } while (next === activeTexture && textureNames.length > 1);

      // 30% chance of silence (no texture) for breathing room
      if (Math.random() < 0.3) {
        activeTexture = null;
      } else {
        activeTexture = next;
        fadeInTexture(next);
      }

      const dur = TEXTURE_CYCLE_MIN + Math.random() * (TEXTURE_CYCLE_MAX - TEXTURE_CYCLE_MIN);
      textureTimeout = setTimeout(cycleTexture, dur);
    }

    // Start first texture after a short delay
    textureTimeout = setTimeout(cycleTexture, 5000 + Math.random() * 10000);
  }

  function fadeInTexture(name) {
    const tex = TEXTURES[name];
    if (!tex) return;

    const fadeDur = 3;

    if (name === 'rain' || name === 'ocean') {
      // Filtered noise layer
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = tex.noiseType;
      filter.frequency.value = tex.freq;
      filter.Q.value = tex.Q;

      const texLfo = ctx.createOscillator();
      texLfo.type = 'sine';
      texLfo.frequency.value = tex.lfoRate;
      const texLfoGain = ctx.createGain();
      texLfoGain.gain.value = tex.lfoDepth;
      texLfo.connect(texLfoGain);
      texLfoGain.connect(filter.frequency);

      const texGain = ctx.createGain();
      texGain.gain.setValueAtTime(0, ctx.currentTime);
      texGain.gain.linearRampToValueAtTime(tex.gain, ctx.currentTime + fadeDur);

      src.connect(filter);
      filter.connect(texGain);
      texGain.connect(masterGain);

      src.start();
      texLfo.start();

      activeTextureNodes = [
        { node: src, type: 'source' },
        { node: texLfo, type: 'source' },
        { node: texGain, type: 'gain' },
      ];

    } else if (name === 'heartbeat') {
      // Subtle low pulse
      const texGain = ctx.createGain();
      texGain.gain.setValueAtTime(0, ctx.currentTime);
      texGain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeDur);
      texGain.connect(masterGain);

      activeTextureNodes = [{ node: texGain, type: 'gain' }];

      function beat() {
        if (destroyed || !playing || activeTexture !== 'heartbeat') return;

        // Two quick thumps (lub-dub)
        const now = ctx.currentTime;
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = tex.freq;
          const g = ctx.createGain();
          g.gain.value = 0;
          osc.connect(g);
          g.connect(texGain);

          const offset = i * 0.15;
          const vol = i === 0 ? tex.gain : tex.gain * 0.6;
          g.gain.setValueAtTime(0, now + offset);
          g.gain.linearRampToValueAtTime(vol, now + offset + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
          osc.start(now + offset);
          osc.stop(now + offset + 0.35);
        }
      }

      beat();
      heartbeatInterval = setInterval(beat, (1 / tex.rate) * 1000);

    } else if (name === 'bells') {
      // Distant resonant bells
      const texGain = ctx.createGain();
      texGain.gain.setValueAtTime(0, ctx.currentTime);
      texGain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeDur);
      texGain.connect(masterGain);

      activeTextureNodes = [{ node: texGain, type: 'gain' }];

      function scheduleBell() {
        if (destroyed || !playing || activeTexture !== 'bells') return;

        const [minI, maxI] = tex.interval;
        const delay = minI + Math.random() * (maxI - minI);

        setTimeout(() => {
          if (destroyed || !playing || activeTexture !== 'bells') return;

          const freq = tex.freqs[Math.floor(Math.random() * tex.freqs.length)];
          const now = ctx.currentTime;
          const [minD, maxD] = tex.decay;
          const decay = minD + Math.random() * (maxD - minD);

          // Bell: sine + slight inharmonic partial
          for (let p = 0; p < 2; p++) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = p === 0 ? freq : freq * 2.76; // inharmonic
            const g = ctx.createGain();
            g.gain.value = 0;
            osc.connect(g);
            g.connect(texGain);

            const vol = p === 0 ? tex.gain : tex.gain * 0.3;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(vol, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.00001, now + decay);
            osc.start(now);
            osc.stop(now + decay + 0.1);
          }

          scheduleBell();
        }, delay);
      }

      scheduleBell();
    }
  }

  function fadeOutTexture() {
    const fadeDur = 2;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    for (const item of activeTextureNodes) {
      if (item.type === 'gain') {
        try {
          item.node.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeDur);
        } catch (_) {}
      }
      if (item.type === 'source') {
        try {
          item.node.stop(ctx.currentTime + fadeDur + 0.1);
        } catch (_) {}
      }
    }
    activeTextureNodes = [];
    activeTexture = null;
  }

  // ── Controls ───────────────────────────────────────────────────

  function play() {
    if (destroyed) return;
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;

    const target = muted ? 0 : volume;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(target, ctx.currentTime + FADE_IN_DURATION);

    scheduleChime();
    startMoodWalk();
    startTextureCycle();
  }

  function pause() {
    if (destroyed) return;
    playing = false;

    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_DURATION);

    if (chimeTimeout) { clearTimeout(chimeTimeout); chimeTimeout = null; }
    stopMoodWalk();
    if (textureTimeout) { clearTimeout(textureTimeout); textureTimeout = null; }
    fadeOutTexture();
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (playing && !muted) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
    }
  }

  function setMoodData(newMoodData) {
    if (!newMoodData || newMoodData.length === 0) return;
    moodSequence = newMoodData.map(d => d.mood);
    moodIndex = 0;

    // Transition to the first mood immediately
    transitionToMood(moodSequence[0]);
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

    if (chimeTimeout) { clearTimeout(chimeTimeout); chimeTimeout = null; }
    stopMoodWalk();
    if (textureTimeout) { clearTimeout(textureTimeout); textureTimeout = null; }
    fadeOutTexture();

    [padOsc, padOsc2, padOsc3, lfo, noiseNode, noiseLfo].forEach((node) => {
      try { node.stop(); } catch (_) {}
    });

    ctx.close();
  }

  return {
    play,
    pause,
    setVolume,
    setMoodData,
    toggleMute,
    destroy,
    get volume() { return volume; },
    get muted() { return muted; },
    get playing() { return playing; },
  };
}
