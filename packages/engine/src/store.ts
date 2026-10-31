/** store.ts — store de jeu PARTAGÉ (web + mobile) via factory.
 *  Injecte un Storage et (optionnel) un LeaderboardClient. */
import { create } from 'zustand';
import type { Puzzle } from './difficulty';
import { difficultyForOperands } from './difficulty';
import {
  BASE_RULES, validateAnswer, scorePuzzle, rankForXp, breaksStreak,
  classicCurriculum, dailyPuzzle, freeSkillPick, adjustLevel, dateKey, FREESKILL_START,
  newRogueRun, rogueOnSolve, rogueOnFail, applyModifier, draftModifiers, exprTokens, hintStarCeiling,
  type Rules, type Mode, type Reason, type RogueRun, type RogueModifier,
} from './game-engine';
import { solveOne } from './solve-one';
import { type Storage, type SaveState, EMPTY_SAVE, loadSave, persistSave } from './persistence';
import { type LeaderboardClient, type LbEntry, makeDeviceId } from './leaderboard';

type Diff = 1 | 2 | 3 | 4 | 5;
const FREE_BASE_SECONDS = 45;

export interface Feedback {
  ok: boolean; stars?: 0 | 1 | 2 | 3; value?: number | null;
  operands?: number; optimalOperands?: number; gained?: number;
  optimal: string; target: number; soft?: boolean;
  reason?: Reason | 'timeout'; canAdvance?: boolean; pr?: boolean;
}

export interface Session {
  mode: Mode; rules: Rules; table: Puzzle[];
  puzzle: Puzzle; optimalOperands: number; input: string;
  index: number; score: number;
  level: Diff; fails: number; secondsLeft: number; maxSeconds: number;
  streak: number;
  hintsUsed: number;            // indices consommés sur ce puzzle
  prevBest: number;             // meilleur score du mode AU DÉBUT de la run (snapshot)
  prShown: boolean;             // record perso déjà célébré sur cette run ? (anti-spam)
  rogue: RogueRun | null;
  feedback: Feedback | null; draft: RogueModifier[] | null;
}

export interface GameState extends Omit<SaveState, 'version'> {
  session: Session | null; hydrated: boolean;
  rank: () => number;
  hydrate: () => Promise<void>;
  setSetting: <K extends keyof SaveState['settings']>(k: K, v: SaveState['settings'][K]) => void;
  setPseudo: (p: string) => void;
  resetProgress: () => void;
  start: (mode: Mode, table: Puzzle[]) => void;
  press: (tok: string) => void; del: () => void; clear: () => void;
  hint: () => void;
  submit: () => void; tick: () => void; next: () => void;
  chooseModifier: (mod: RogueModifier) => void; clearSoftFeedback: () => void; quit: () => void;
  fetchLeaderboard: (mode: Mode, limit?: number) => Promise<LbEntry[]>;
}

function rulesFor(mode: Mode): Rules {
  return mode.startsWith('big') ? { ...BASE_RULES, required: [Number(mode.slice(3))] } : { ...BASE_RULES };
}
function pickPuzzle(mode: Mode, table: Puzzle[], rules: Rules, level: Diff, index: number): { puzzle: Puzzle; optimalOperands: number } {
  if (mode === 'rogue') {
    for (let t = 0; t < 60; t++) {
      const target = 5 + Math.floor(Math.random() * 195);
      const sol = solveOne(target, rules);
      if (sol) return { puzzle: { target, expr: sol.expr, operands: sol.operands, difficulty: difficultyForOperands(sol.operands) }, optimalOperands: sol.operands };
    }
  }
  let puzzle: Puzzle;
  if (mode === 'freeskill') puzzle = freeSkillPick(table, level);
  else if (mode === 'daily') puzzle = dailyPuzzle(table);
  else { const list = classicCurriculum(table, mode.startsWith('big') ? 60 : 100); puzzle = list[index % list.length]; }
  return { puzzle, optimalOperands: puzzle.operands };
}

export function createGameStore(storage: Storage, leaderboard?: LeaderboardClient) {
  const save = (get: () => GameState) => {
    const s = get();
    const st: SaveState = {
      version: 3, xp: s.xp, classicProgress: s.classicProgress, classicStars: s.classicStars,
      bestByMode: s.bestByMode, streakByMode: s.streakByMode, bestStreakByMode: s.bestStreakByMode,
      dailyDone: s.dailyDone, deviceId: s.deviceId, pseudo: s.pseudo, settings: s.settings, stats: s.stats,
    };
    void persistSave(storage, st);
  };

  return create<GameState>((set, get) => ({
    ...(() => { const { version: _v, ...rest } = EMPTY_SAVE; return rest; })(), session: null, hydrated: false,
    rank: () => rankForXp(get().xp),

    async hydrate() {
      const s = await loadSave(storage);
      if (!s.deviceId) s.deviceId = makeDeviceId();
      set({ ...s, hydrated: true });
      save(get);
    },
    setSetting(k, v) { set((st) => ({ settings: { ...st.settings, [k]: v } })); save(get); },
    setPseudo(p) { set({ pseudo: p.slice(0, 16) }); save(get); },
    resetProgress() {
      set({ xp: 0, classicProgress: 0, classicStars: {}, bestByMode: {}, streakByMode: {}, bestStreakByMode: {}, dailyDone: null });
      save(get);
    },

    start(mode, table) {
      const rogue = mode === 'rogue' ? newRogueRun() : null;
      const rules = rogue ? rogue.rules : rulesFor(mode);
      const index = mode === 'classic' ? get().classicProgress : 0;
      const level = mode === 'freeskill' ? FREESKILL_START : 1;
      const { puzzle, optimalOperands } = pickPuzzle(mode, table, rules, level, index);
      const maxSeconds = mode === 'freeskill' ? FREE_BASE_SECONDS + (level - 1) * 8 : 0;
      set({
        session: {
          mode, rules, table, puzzle, optimalOperands, input: '', index, score: 0,
          level, fails: 0, secondsLeft: maxSeconds, maxSeconds, streak: get().streakByMode[mode] ?? 0,
          hintsUsed: 0, prevBest: get().bestByMode[mode] ?? 0, prShown: false,
          rogue, feedback: null, draft: null,
        },
      });
    },

    press(tok) { set((st) => st.session && !st.session.feedback ? { session: { ...st.session, input: st.session.input + tok } } : {}); },
    del() { set((st) => st.session ? { session: { ...st.session, input: st.session.input.replace(/[+\-*]?\d+$|.$/, '') } } : {}); },
    clear() { set((st) => st.session ? { session: { ...st.session, input: '' } } : {}); },
    clearSoftFeedback() { set((st) => st.session ? { session: { ...st.session, feedback: null } } : {}); },

    hint() {
      const s = get().session; if (!s || s.feedback) return;
      const total = exprTokens(s.puzzle.expr).length;
      if (s.hintsUsed < total) set({ session: { ...s, hintsUsed: s.hintsUsed + 1 } });
    },

    submit() {
      const st = get(); const s = st.session; if (!s || s.feedback) return;
      const v = validateAnswer(s.input, s.puzzle.target, s.optimalOperands, s.rules);

      if (!v.ok) {
        const lose = breaksStreak(v.reason);
        set({
          streakByMode: lose ? { ...st.streakByMode, [s.mode]: 0 } : st.streakByMode,
          session: { ...s, streak: lose ? 0 : s.streak, fails: lose ? s.fails + 1 : s.fails, feedback: { ok: false, soft: !lose, reason: v.reason, optimal: s.puzzle.expr, target: s.puzzle.target } },
        });
        if (lose) save(get);
        return;
      }

      // plafond d'étoiles si des indices ont été utilisés
      const totalTokens = exprTokens(s.puzzle.expr).length;
      const stars = Math.min(v.stars, hintStarCeiling(s.hintsUsed, totalTokens)) as 0 | 1 | 2 | 3;

      const streak = s.streak + 1;
      const gained = scorePuzzle({ difficulty: s.puzzle.difficulty, stars, mode: s.mode, secondsLeft: s.secondsLeft, rogueMult: s.rogue?.scoreMult ?? 1, streak: s.streak });
      const sessionScore = s.score + gained;
      const current = s.rogue ? s.rogue.score + gained : sessionScore;

      // RECORD PERSO : célébré UNE seule fois par run (anti-spam)
      const isPr = current > s.prevBest && !s.prShown && s.prevBest > 0;
      if ((isPr || (s.prevBest === 0 && current > 0 && !s.prShown)) && st.settings.leaderboardOptIn && st.pseudo && leaderboard) {
        void leaderboard.submit({ id: st.deviceId, pseudo: st.pseudo, mode: s.mode, score: current, expr: s.input, at: Date.now() });
      }
      const pr = (isPr || (s.prevBest === 0 && current > 0 && !s.prShown));

      const classicStars = s.mode === 'classic' ? { ...st.classicStars, [s.index]: Math.max(st.classicStars[s.index] ?? 0, stars) } : st.classicStars;
      const canAdvance = s.mode !== 'classic' || stars === 3;

      set({
        xp: st.xp + gained,
        streakByMode: { ...st.streakByMode, [s.mode]: streak },
        bestStreakByMode: { ...st.bestStreakByMode, [s.mode]: Math.max(st.bestStreakByMode[s.mode] ?? 0, streak) },
        bestByMode: { ...st.bestByMode, [s.mode]: Math.max(st.bestByMode[s.mode] ?? 0, current) },
        classicStars,
        stats: { ...st.stats, played: st.stats.played + 1, perfect: st.stats.perfect + (stars === 3 ? 1 : 0) },
        dailyDone: s.mode === 'daily' ? dateKey() : st.dailyDone,
        session: { ...s, streak, score: sessionScore, fails: 0, prShown: s.prShown || pr,
          feedback: { ok: true, stars, value: v.value, operands: v.operands, optimalOperands: v.optimalOperands, gained, optimal: s.puzzle.expr, target: s.puzzle.target, canAdvance, pr } },
      });
      save(get);
    },

    tick() {
      const s = get().session; if (!s || s.mode !== 'freeskill' || s.feedback) return;
      if (s.secondsLeft <= 1) {
        set((st) => ({
          streakByMode: { ...st.streakByMode, freeskill: 0 },
          session: { ...s, secondsLeft: 0, streak: 0, fails: s.fails + 1, feedback: { ok: false, soft: false, reason: 'timeout', optimal: s.puzzle.expr, target: s.puzzle.target } },
        }));
        save(get);
      } else set({ session: { ...s, secondsLeft: s.secondsLeft - 1 } });
    },

    next() {
      const st = get(); const s = st.session; if (!s) return;

      if (s.mode === 'rogue' && s.rogue) {
        const won = !!s.feedback?.ok;
        let run = s.rogue;
        if (won) {
          const r = rogueOnSolve(run, s.feedback?.gained ?? 0); run = r.run;
          if (r.shouldDraft) { set({ session: { ...s, rogue: run, draft: draftModifiers(), feedback: null, input: '', hintsUsed: 0 } }); return; }
        } else {
          run = rogueOnFail(run);
          if (run.over) { set({ bestByMode: { ...st.bestByMode, rogue: Math.max(st.bestByMode.rogue ?? 0, run.score) }, session: { ...s, rogue: run, feedback: null } }); save(get); return; }
        }
        const { puzzle, optimalOperands } = pickPuzzle('rogue', s.table, run.rules, 1, 0);
        set({ session: { ...s, rogue: run, rules: run.rules, puzzle, optimalOperands, input: '', feedback: null, hintsUsed: 0 } });
        return;
      }

      if (s.mode === 'classic') {
        const advance = s.feedback?.canAdvance === true;
        const index = advance ? Math.min(s.index + 1, classicCurriculum(s.table, 100).length - 1) : s.index;
        if (advance) set({ classicProgress: Math.max(st.classicProgress, index) });
        const { puzzle, optimalOperands } = pickPuzzle('classic', s.table, s.rules, s.level, index);
        set({ session: { ...s, index, puzzle, optimalOperands, input: '', feedback: null, hintsUsed: 0 } });
        if (advance) save(get);
        return;
      }

      let { level, fails } = s; let index = s.index;
      if (s.mode === 'freeskill') { level = adjustLevel(level, s.streak, fails); fails = 0; }
      else index = s.index + 1;
      const { puzzle, optimalOperands } = pickPuzzle(s.mode, s.table, s.rules, level, index);
      const maxSeconds = s.mode === 'freeskill' ? FREE_BASE_SECONDS + (level - 1) * 8 : 0;
      set({ session: { ...s, level, fails, index, puzzle, optimalOperands, input: '', feedback: null, hintsUsed: 0, secondsLeft: maxSeconds, maxSeconds } });
    },

    chooseModifier(mod) {
      const s = get().session; if (!s || !s.rogue) return;
      const run = applyModifier(s.rogue, mod);
      const { puzzle, optimalOperands } = pickPuzzle('rogue', s.table, run.rules, 1, 0);
      set({ session: { ...s, rogue: run, rules: run.rules, puzzle, optimalOperands, input: '', feedback: null, draft: null, hintsUsed: 0 } });
    },

    quit() { set({ session: null }); },
    async fetchLeaderboard(mode, limit = 50) { return leaderboard ? leaderboard.top(mode, limit) : []; },
  }));
}
