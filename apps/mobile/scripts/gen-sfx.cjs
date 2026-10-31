/** gen-sfx.cjs — synthétise les bruitages en WAV (PCM 16-bit mono 44.1kHz).
 *  Aucune dépendance. Lancer : node scripts/gen-sfx.cjs
 *  Doit produire les mêmes timbres que la version web (Web Audio). */
const fs = require('node:fs');
const path = require('node:path');
const SR = 44100;

const wave = {
  sine: (t, f) => Math.sin(2 * Math.PI * f * t),
  triangle: (t, f) => 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * f * t)),
  saw: (t, f) => 2 * (t * f - Math.floor(0.5 + t * f)),
  square: (t, f) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1),
};

/** segments: [{freq, dur, type, gain, delay}] — delay = silence avant le segment */
function render(segments) {
  const total = segments.reduce((a, s) => a + (s.delay || 0) + s.dur, 0);
  const n = Math.ceil(total * SR);
  const buf = new Float32Array(n);
  let cursor = 0;
  for (const s of segments) {
    cursor += (s.delay || 0);
    const start = Math.floor(cursor * SR);
    const len = Math.floor(s.dur * SR);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, i / (SR * 0.005)) * Math.exp(-t / (s.dur * 0.5)); // attaque douce + décroissance expo
      buf[start + i] += wave[s.type](t, s.freq) * (s.gain ?? 0.5) * env;
    }
    cursor += s.dur;
  }
  return buf;
}

function toWav(samples) {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return b;
}

const SFX = {
  select: [{ freq: 520, dur: 0.07, type: 'triangle', gain: 0.5 }],
  success: [{ freq: 660, dur: 0.10, type: 'sine', gain: 0.55 }, { freq: 880, dur: 0.16, type: 'sine', gain: 0.55, delay: 0.02 }],
  fail: [{ freq: 200, dur: 0.20, type: 'saw', gain: 0.45 }],
  tick: [{ freq: 900, dur: 0.035, type: 'square', gain: 0.30 }],
  timeup: [{ freq: 300, dur: 0.20, type: 'saw', gain: 0.5 }, { freq: 160, dur: 0.32, type: 'saw', gain: 0.5, delay: 0.02 }],
  record: [{ freq: 523, dur: 0.10, type: 'triangle', gain: 0.5 }, { freq: 659, dur: 0.10, type: 'triangle', gain: 0.5, delay: 0.0 }, { freq: 784, dur: 0.10, type: 'triangle', gain: 0.5 }, { freq: 1046, dur: 0.20, type: 'sine', gain: 0.5 }],
};

const out = path.resolve(__dirname, '../assets/sfx');
fs.mkdirSync(out, { recursive: true });
for (const [name, segs] of Object.entries(SFX)) {
  const file = path.join(out, `${name}.wav`);
  fs.writeFileSync(file, toWav(render(segs)));
  console.log(`${name}.wav  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}
console.log('OK');
