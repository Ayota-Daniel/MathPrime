import { performance } from 'node:perf_hooks';
import { Generator, simulate } from '../src/rogue-v1';
import type { Policy } from '../src/rogue-v1';

const args = process.argv.slice(2);
const allowed = new Set(['--seed', '--runs', '--policy', '--survival', '--log']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error(`Unknown option: ${args[i]}`);
  if (args[i] !== '--log') {
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value: ${args[i]}`);
    i++;
  }
}
function argument(name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}
const samples: number[] = [];
const original = Generator.prototype.generate;
Generator.prototype.generate = function (...parameters) {
  const before = performance.now();
  const result = original.apply(this, parameters);
  samples.push(performance.now() - before);
  return result;
};
const started = performance.now();
const report = simulate({
  seed: Number(argument('--seed', '42')), runs: Number(argument('--runs', '5')),
  policy: argument('--policy', 'equilibre') as Policy,
  survivalPuzzles: Number(argument('--survival', '0')),
});
const elapsedMs = performance.now() - started;
samples.sort((a, b) => a - b);
console.log(JSON.stringify({
  ...report,
  runs: args.includes('--log') ? report.runs : undefined,
  performance: {
    environment: `${process.platform}/${process.arch} Node ${process.version}`,
    elapsedMs, generated: samples.length,
    generationMeanMs: samples.reduce((a, b) => a + b, 0) / (samples.length || 1),
    generationP95Ms: samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))] ?? 0,
    generationMaxMs: samples[samples.length - 1] ?? 0,
    note: 'Mesures locales, cache inclus. La durée totale inclut les prévalidations de drafts. Aucune mesure Android.',
  },
}, null, 2));
