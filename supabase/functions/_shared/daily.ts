import { BASE_RULES, breaksStreak, dailyPuzzle, exprTokens, hintStarCeiling, scorePuzzle, validateAnswer } from '../../../packages/engine/src/game-engine.ts';
import base from '../../../packages/engine/data/puzzles.base.json' with { type: 'json' };
import type { CompetitionEvent, CompetitionReply } from '../../../packages/engine/src/competitive-types.ts';
import type { Puzzle } from '../../../packages/engine/src/difficulty.ts';

export interface ServerRun {
  id: string; user_id: string; day: string; version: number; hints: number;
  streak: number; rewarded: boolean; confirmed_best: number;
}
export class RequestError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseAction(value: unknown): { action: 'start'; mode: 'daily' } | CompetitionEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError(400, 'bad_request');
  const v = value as Record<string, unknown>;
  if (v.action === 'start' && v.mode === 'daily' && Object.keys(v).length === 2) return { action: 'start', mode: 'daily' };
  const allowed = v.action === 'answer' ? ['action', 'runId', 'eventId', 'version', 'pseudo', 'expression'] : ['action', 'runId', 'eventId', 'version', 'pseudo'];
  if (!['answer', 'hint'].includes(String(v.action)) || Object.keys(v).some((key) => !allowed.includes(key))
    || typeof v.runId !== 'string' || !uuid.test(v.runId) || typeof v.eventId !== 'string' || !uuid.test(v.eventId)
    || !Number.isSafeInteger(v.version) || Number(v.version) < 0 || Number(v.version) > 10000
    || typeof v.pseudo !== 'string' || v.pseudo.trim().length < 1 || v.pseudo.length > 16 || /[\x00-\x1f\x7f]/.test(v.pseudo)
    || (v.action === 'answer' && (typeof v.expression !== 'string' || v.expression.length > 256))) throw new RequestError(400, 'bad_request');
  return v as unknown as CompetitionEvent;
}
export function puzzleFor(run: ServerRun): Puzzle {
  return dailyPuzzle(base as Puzzle[], new Date(`${run.day}T00:00:00Z`));
}
export function present(run: ServerRun): CompetitionReply {
  const puzzle = puzzleFor(run);
  return { challenge: { id: run.id, day: run.day, version: run.version, target: puzzle.target,
    optimalOperands: puzzle.operands, difficulty: puzzle.difficulty, hints: run.hints,
    hint: exprTokens(puzzle.expr).slice(0, run.hints).join(''), streak: run.streak, rewarded: run.rewarded }, confirmedBest: run.confirmed_best };
}
export function applyAction(run: ServerRun, event: CompetitionEvent, today: string): CompetitionReply {
  if (run.day !== today) throw new RequestError(410, 'expired');
  if (run.rewarded) throw new RequestError(409, 'daily_done');
  if (event.version !== run.version) throw new RequestError(409, 'stale_version');
  const puzzle = puzzleFor(run);
  const tokens = exprTokens(puzzle.expr);
  const next = { ...run, version: run.version + 1 };
  if (event.action === 'hint') {
    if (run.hints >= tokens.length) throw new RequestError(409, 'no_more_hints');
    return present({ ...next, hints: run.hints + 1 });
  }
  const validation = validateAnswer(event.expression!, puzzle.target, puzzle.operands, BASE_RULES);
  if (!validation.ok) {
    const response = present({ ...next, streak: breaksStreak(validation.reason) ? 0 : run.streak });
    return { ...response, outcome: { ok: false, stars: 0, gained: 0, reason: validation.reason } };
  }
  const stars = Math.min(validation.stars, hintStarCeiling(run.hints, tokens.length)) as 0 | 1 | 2 | 3;
  const gained = scorePuzzle({ difficulty: puzzle.difficulty, stars, mode: 'daily', streak: run.streak });
  return { ...present({ ...next, rewarded: true, streak: run.streak + 1 }), outcome: { ok: true, stars, gained } };
}
