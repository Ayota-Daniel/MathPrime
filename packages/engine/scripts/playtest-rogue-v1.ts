import * as readline from 'node:readline';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PlaytestSession } from '../src/rogue-v1/playtest/session';
import type { Clock } from '../src/rogue-v1/playtest/session';
import { parseOptions } from '../src/rogue-v1/playtest/options';
import { renderSession } from '../src/rogue-v1/playtest/render';
import { saveReport } from './rogue-playtest-log';

let options: ReturnType<typeof parseOptions>;
try { options = parseOptions(process.argv.slice(2)); }
catch (error) { console.error((error as Error).message); process.exit(1); }
if (options.help) {
  console.log('MathPrime playtest : --format short|full (full par défaut), --seed ENTIER (42 par défaut).\nCommandes dans le jeu : aide. Journaux locaux : .playtests/rogue-v1/ à la racine.');
  process.exit(0);
}
const { format, seed } = options;
const logRoot = fileURLToPath(new URL('../../../.playtests/rogue-v1/', import.meta.url));
const reportPath = join(logRoot, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`);
const clock: Clock = {
  now: () => performance.now(),
  schedule: (callback, milliseconds) => setTimeout(callback, milliseconds),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
const terminal = Boolean(process.stdin.isTTY && process.stdout.isTTY && process.env.TERM !== 'dumb');
const input = readline.createInterface({ input: process.stdin, output: process.stdout, terminal });
const session = new PlaytestSession(format, seed, clock, () => {
  if (terminal) {
    input.write(null, { ctrl: true, name: 'a' });
    input.write(null, { ctrl: true, name: 'k' });
  }
  display();
});
let closed = false;
function persist(): void {
  try { saveReport(reportPath, session.report()); }
  catch (error) {
    console.error(`Impossible d’écrire le rapport local ${reportPath} : ${String(error)}`);
    process.exitCode = 1;
    session.command('quitter');
    closed = true;
    input.close();
  }
}
function prompt(): void {
  if (!terminal || closed) return;
  input.setPrompt(session.screen === 'playing' ? `[${Math.ceil(session.remainingSeconds())} s] > ` : '> ');
  input.prompt(true);
}
function display(): void {
  if (closed) return;
  if (terminal) { readline.clearLine(process.stdout, 0); readline.cursorTo(process.stdout, 0); }
  console.log(renderSession(session));
  persist();
  if (session.screen === 'ended' && !closed) {
    console.log(`Résumé : score ${session.run.score}, ${session.attempts.filter(attempt => attempt.outcome === 'success').length} réussites, ${session.attempts.filter(attempt => attempt.outcome === 'failure').length} échecs.\nRapport local : ${reportPath}`);
    closed = true;
    input.close();
  } else prompt();
}
// Updating readline's prompt preserves its edit buffer instead of printing countdown lines.
const countdown = setInterval(() => { if (session.screen === 'playing') prompt(); }, 1000);
input.on('line', line => { session.command(line); display(); });
input.on('SIGINT', () => { session.command('quitter'); display(); });
input.on('close', () => {
  clearInterval(countdown);
  if (!closed) { session.command('quitter'); display(); closed = true; }
});
process.on('SIGINT', () => { session.command('quitter'); display(); });
process.on('SIGTERM', () => { session.command('quitter'); display(); });
if (!terminal) console.log('Affichage sans rafraîchissement : tapez temps pour lire le temps restant. L’expiration reste automatique.');
console.log('Playtest local expérimental. Tapez aide. Seule la commande soumettre EXPR valide une réponse.');
display();
