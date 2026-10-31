/** gen-music.cjs — boucle musicale de fond (12 s, sans raccord audible).
 *  Sans dépendance. Sortie vers web/public et mobile/assets.
 *  Lancer : node tools/gen-music.cjs */
const fs = require('node:fs');
const path = require('node:path');
const SR = 44100;

// progression calme en La mineur : Am - F - C - G (3 s chacun)
const CH = [
  [220.00, 261.63, 329.63],
  [174.61, 220.00, 261.63],
  [261.63, 329.63, 392.00],
  [196.00, 246.94, 293.66],
];
const CHORD_DUR = 3.0;
const total = CH.length * CHORD_DUR;
const n = Math.floor(total * SR);
const buf = new Float32Array(n);

const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
const tri = (t, f) => (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
// fenêtre cosinus : ~0 aux bords -> boucle sans clic
const win = (x) => 0.5 - 0.5 * Math.cos(2 * Math.PI * x);

for (let c = 0; c < CH.length; c++) {
  const start = Math.floor(c * CHORD_DUR * SR);
  const len = Math.floor(CHORD_DUR * SR);
  const notes = CH[c];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const g = win(i / len); // fondu entrée/sortie de l'accord
    // pad : somme des notes (sine + légère 2e harmonique)
    let pad = 0;
    for (const f of notes) pad += sine(t, f) * 0.6 + sine(t, f * 2) * 0.12;
    pad *= 0.06 * g;
    // arpège doux : une note par seconde, octave au-dessus, courte décroissance
    const beat = Math.floor(t) % 3;
    const tb = t - Math.floor(t);
    const arp = tri(tb, notes[beat] * 2) * 0.05 * Math.exp(-tb / 0.4) * g;
    buf[start + i] += pad + arp;
  }
}

// normalisation douce
let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[i]));
const k = peak > 0 ? 0.7 / peak : 1;

function toWav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * k));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return b;
}

const wav = toWav(buf);
const out = [
  path.resolve(__dirname, '../apps/web/public/music.wav'),
  path.resolve(__dirname, '../apps/mobile/assets/music.wav'),
];
for (const f of out) { fs.writeFileSync(f, wav); console.log(`${f}  ${(wav.length / 1024 / 1024).toFixed(2)} MB`); }
console.log('OK loop=' + total + 's');
