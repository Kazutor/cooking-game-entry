// Synthesised sound, nothing loaded: a sizzle bed over the grill, a ding for a
// served plate, a low buzz for a wrong one. The context starts on the first
// gesture, so the game never plays before the player touches it.
export function createAudio() {
  let context = null;
  let sizzle = null;
  let sizzleGain = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    // Looping filtered noise, kept quiet until the grill is busy.
    const length = context.sampleRate;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.6;
    sizzleGain = context.createGain();
    sizzleGain.gain.value = 0;
    source.connect(filter).connect(sizzleGain).connect(context.destination);
    source.start();
    sizzle = source;
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + seconds + 0.02);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    },
    setMuted(value) {
      muted = value;
      if (sizzleGain) sizzleGain.gain.value = 0;
    },
    isMuted() {
      return muted;
    },
    /** The grill hisses louder the more skewers are on it. */
    setGrillLevel(level) {
      if (muted || !sizzleGain || !context) return;
      sizzleGain.gain.setTargetAtTime(0.015 + level * 0.05, context.currentTime, 0.2);
    },
    pickup() {
      tone(660, 0.07, 'triangle', 0.12);
    },
    place() {
      tone(220, 0.09, 'triangle', 0.16);
      tone(440, 0.06, 'sine', 0.08, 0.02);
    },
    plated() {
      tone(520, 0.08, 'sine', 0.12);
      tone(780, 0.1, 'sine', 0.1, 0.06);
    },
    serve() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1174, 0.18, 'sine', 0.14, 0.09);
    },
    wrong() {
      tone(160, 0.25, 'sawtooth', 0.1);
      tone(120, 0.3, 'sawtooth', 0.09, 0.08);
    },
    burnt() {
      tone(300, 0.15, 'square', 0.06);
    },
    angry() {
      tone(196, 0.2, 'sawtooth', 0.1);
      tone(147, 0.28, 'sawtooth', 0.09, 0.12);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.22, 'sine', 0.14, index * 0.11));
    },
  };
}
