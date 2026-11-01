/** store.ts — store de jeu PARTAGÉ (web + mobile) via factory.
 *  Injecte un Storage et (optionnel) un LeaderboardClient. */
import { create } from 'zustand';
import type { Puzzle } from './difficulty';
import {
  BASE_RULES, validateAnswer, scorePuzzle, rankForXp, breaksStreak,
  classicCurriculum, dailyPuzzle, freeSkillPick, adjustLevel, dateKey, FREESKILL_START,
  newRogueRun, rogueOnSolve, rogueOnFail, applyModifier, draftModifiers, isModifierCompatible, exprTokens, hintStarCeiling,
  type Rules, type Mode, type Reason, type RogueRun, type RogueModifier,
} from './game-engine';
import { pickRoguePuzzle } from './rogue-puzzles';
import { type Storage, type SaveState, EMPTY_SAVE, loadSave, persistSave } from './persistence';
import { type LeaderboardClient, type LbEntry, makeDeviceId } from './leaderboard';

type Diff = 1 | 2 | 3 | 4 | 5;
const FREE_BASE_SECONDS = 45;

export interface Feedback {
  ok: boolean; stars?: 0 | 1 | 2 | 3; value?: number | null;
  operands?: number; optimalOperands?: number; gained?: number;
  optimal: string; target: number; soft?: boolean;
  reason?: Reason | 'timeout' | 'save_failed'; canAdvance?: boolean; pr?: boolean; training?: boolean;
}

export interface Session {
  mode: Mode; rules: Rules; table: Puzzle[];
  puzzle: Puzzle; optimalOperands: number; input: string;
  index: number; score: number;
  level: Diff; fails: number; secondsLeft: number; maxSeconds: number;
  streak: number;
  dailyDate: string | null;
  dailyTraining: boolean;
  dailySaving: boolean;
  hintsUsed: number;            // indices consommés sur ce puzzle
  prevBest: number;             // meilleur score du mode AU DÉBUT de la run (snapshot)
  prShown: boolean;             // record perso déjà célébré sur cette run ? (anti-spam)
  rogue: RogueRun | null;
  feedback: Feedback | null; draft: RogueModifier[] | null;
}

export interface GameState extends Omit<SaveState, 'version'> {
  session: Session | null; hydrated: boolean; rogueSelectionFailed: boolean;
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
function pickTablePuzzle(mode: Exclude<Mode, 'rogue'>, table: Puzzle[], level: Diff, index: number, date = new Date()): Puzzle {
  let puzzle: Puzzle;
  if (mode === 'freeskill') puzzle = freeSkillPick(table, level);
  else if (mode === 'daily') puzzle = dailyPuzzle(table, date);
  else { const list = classicCurriculum(table, mode.startsWith('big') ? 60 : 100); puzzle = list[index % list.length]; }
  return puzzle;
}

function stopRogueSelection(session: Session, run: RogueRun): Session {
  return { ...session, rogue: { ...run, over: true }, draft: null, feedback: null, input: '' };
}

export function createGameStore(storage: Storage, leaderboard?: LeaderboardClient, now: () => Date = () => new Date()) {
  let pendingSave: Promise<void> = Promise.resolve();
  const pendingDailyRewards = new Set<string>();
  const saveState = (s: GameState, updates: Partial<SaveState> = {}): SaveState => ({
      version: 3, xp: s.xp, classicProgress: s.classicProgress, classicStars: s.classicStars,
      bestByMode: s.bestByMode, streakByMode: s.streakByMode, bestStreakByMode: s.bestStreakByMode,
      dailyDone: s.dailyDone, deviceId: s.deviceId, pseudo: s.pseudo, settings: s.settings, stats: s.stats,
      ...updates,
  });
  const persistQueued = (snapshot: SaveState | (() => SaveState)): Promise<void> => {
    const write = pendingSave.then(() => persistSave(storage, typeof snapshot === 'function' ? snapshot() : snapshot));
    pendingSave = write.catch(() => {});
    return write;
  };
  const save = (get: () => GameState) => {
    void persistQueued(() => saveState(get())).catch(() => {});
  };

  return create<GameState>((set, get) => ({
    ...(() => { const { version: _v, ...rest } = EMPTY_SAVE; return rest; })(), session: null, hydrated: false, rogueSelectionFailed: false,
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
      const startedAt = now();
      const today = dateKey(startedAt);
      const puzzle = mode === 'rogue' ? pickRoguePuzzle(rules) : pickTablePuzzle(mode, table, level, index, startedAt);
      if (!puzzle) { set({ session: null, rogueSelectionFailed: true }); return; }
      const optimalOperands = puzzle.operands;
      const maxSeconds = mode === 'freeskill' ? FREE_BASE_SECONDS + (level - 1) * 8 : 0;
      set({
        rogueSelectionFailed: false,
        session: {
          mode, rules, table, puzzle, optimalOperands, input: '', index, score: 0,
          level, fails: 0, secondsLeft: maxSeconds, maxSeconds, streak: get().streakByMode[mode] ?? 0,
          dailyDate: mode === 'daily' ? today : null,
          dailyTraining: mode === 'daily' && (get().dailyDone === today || pendingDailyRewards.has(today)),
          dailySaving: mode === 'daily' && pendingDailyRewards.has(today),
          hintsUsed: 0, prevBest: get().bestByMode[mode] ?? 0, prShown: false,
          rogue, feedback: null, draft: null,
        },
      });
    },

    press(tok) {
      const s = get().session;
      if (!s || s.feedback || s.dailySaving || s.draft || s.rogue?.over) return;
      set({ session: { ...s, input: s.input + tok } });
    },
    del() { set((st) => st.session && !st.session.dailySaving ? { session: { ...st.session, input: st.session.input.replace(/[+\-*]?\d+$|.$/, '') } } : {}); },
    clear() { set((st) => st.session && !st.session.dailySaving ? { session: { ...st.session, input: '' } } : {}); },
    clearSoftFeedback() { set((st) => st.session ? { session: { ...st.session, feedback: null } } : {}); },

    hint() {
      const s = get().session; if (!s || s.feedback || s.dailySaving || s.draft || s.rogue?.over) return;
      const total = exprTokens(s.puzzle.expr).length;
      if (s.hintsUsed < total) set({ session: { ...s, hintsUsed: s.hintsUsed + 1 } });
    },

    submit() {
      const st = get(); const s = st.session; if (!s || s.feedback || s.draft || s.rogue?.over) return;
      if (s.dailySaving) return;
      const today = dateKey(now());
      if (s.mode === 'daily' && pendingDailyRewards.has(today)) return;
      if (s.mode === 'daily' && s.dailyDate !== today) {
        const puzzle = pickTablePuzzle('daily', s.table, s.level, s.index, now());
        set({ session: { ...s, puzzle, optimalOperands: puzzle.operands, dailyDate: today, dailyTraining: st.dailyDone === today, input: '', feedback: null, hintsUsed: 0 } });
        return;
      }
      const dailyTraining = s.mode === 'daily' && st.dailyDone === today;
      const v = validateAnswer(s.input, s.puzzle.target, s.optimalOperands, s.rules);

      if (!v.ok) {
        const lose = breaksStreak(v.reason);
        set({
          streakByMode: lose && !dailyTraining ? { ...st.streakByMode, [s.mode]: 0 } : st.streakByMode,
          session: { ...s, streak: lose && !dailyTraining ? 0 : s.streak, fails: lose ? s.fails + 1 : s.fails, feedback: { ok: false, soft: !lose, reason: v.reason, optimal: s.puzzle.expr, target: s.puzzle.target } },
        });
        if (lose && !dailyTraining) save(get);
        return;
      }

      // plafond d'étoiles si des indices ont été utilisés
      const totalTokens = exprTokens(s.puzzle.expr).length;
      const stars = Math.min(v.stars, hintStarCeiling(s.hintsUsed, totalTokens)) as 0 | 1 | 2 | 3;

      const streak = s.streak + 1;
      const calculatedScore = scorePuzzle({ difficulty: s.puzzle.difficulty, stars, mode: s.mode, secondsLeft: s.secondsLeft, rogueMult: s.rogue?.scoreMult ?? 1, streak: s.streak });
      const gained = dailyTraining ? 0 : calculatedScore;
      const sessionScore = s.rogue ? 0 : s.score + gained;
      const current = s.rogue ? s.rogue.score + gained : sessionScore;

      if (dailyTraining) {
        set({ session: { ...s, dailyTraining: true, streak: s.streak, fails: 0,
          feedback: { ok: true, stars, value: v.value, operands: v.operands, optimalOperands: v.optimalOperands, gained: 0, optimal: s.puzzle.expr, target: s.puzzle.target, canAdvance: true, training: true } } });
        return;
      }

      // RECORD PERSO : célébré UNE seule fois par run (anti-spam)
      const isPr = current > s.prevBest && !s.prShown && s.prevBest > 0;
      const pr = (isPr || (s.prevBest === 0 && current > 0 && !s.prShown));
      const submitLeaderboard = () => {
        if (pr && st.settings.leaderboardOptIn && st.pseudo && leaderboard) {
          void leaderboard.submit({ id: st.deviceId, pseudo: st.pseudo, mode: s.mode, score: current, expr: s.input, at: Date.now() });
        }
      };

      const classicStars = s.mode === 'classic' ? { ...st.classicStars, [s.index]: Math.max(st.classicStars[s.index] ?? 0, stars) } : st.classicStars;
      const canAdvance = s.mode !== 'classic' || stars === 3;

      const newXp = st.xp + gained;
      const newStreaks = { ...st.streakByMode, [s.mode]: streak };
      const newBestStreaks = { ...st.bestStreakByMode, [s.mode]: Math.max(st.bestStreakByMode[s.mode] ?? 0, streak) };
      const newBests = { ...st.bestByMode, [s.mode]: Math.max(st.bestByMode[s.mode] ?? 0, current) };
      const newStats = { ...st.stats, played: st.stats.played + 1, perfect: st.stats.perfect + (stars === 3 ? 1 : 0) };
      const newDailyDone = s.mode === 'daily' ? today : st.dailyDone;
      const feedback: Feedback = { ok: true, stars, value: v.value, operands: v.operands, optimalOperands: v.optimalOperands, gained, optimal: s.puzzle.expr, target: s.puzzle.target, canAdvance, pr };
      const updatedSession: Session = { ...s, dailySaving: s.mode === 'daily', streak, score: sessionScore, fails: 0, prShown: s.prShown || pr, rogue: s.rogue ? { ...s.rogue, score: current } : null, feedback: s.mode === 'daily' ? null : feedback };

      if (s.mode === 'daily') {
        const snapshot = saveState(st, { xp: newXp, streakByMode: newStreaks, bestStreakByMode: newBestStreaks, bestByMode: newBests, classicStars, stats: newStats, dailyDone: newDailyDone });
        pendingDailyRewards.add(today);
        set({ session: updatedSession });
        void persistQueued(snapshot).then(() => {
          pendingDailyRewards.delete(today);
          set({ xp: newXp, streakByMode: newStreaks, bestStreakByMode: newBestStreaks, bestByMode: newBests, classicStars, stats: newStats, dailyDone: newDailyDone,
            session: get().session?.dailySaving ? { ...get().session!, dailySaving: false, feedback } : get().session });
          submitLeaderboard();
        }).catch(() => {
          pendingDailyRewards.delete(today);
          const currentSession = get().session;
          if (currentSession?.dailySaving && currentSession.dailyDate === today) {
            set({ session: { ...currentSession, dailySaving: false, streak: s.streak, score: s.score, prShown: s.prShown, rogue: s.rogue, feedback: { ok: false, soft: true, reason: 'save_failed', optimal: currentSession.puzzle.expr, target: currentSession.puzzle.target } } });
          }
        });
        return;
      }

      set({
        xp: newXp,
        streakByMode: newStreaks,
        bestStreakByMode: newBestStreaks,
        bestByMode: newBests,
        classicStars,
        stats: newStats,
        dailyDone: newDailyDone,
        session: updatedSession,
      });
      save(get);
      submitLeaderboard();
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
      if (s.dailySaving) return;

      if (s.mode === 'daily') {
        const today = dateKey(now());
        if (s.dailyDate !== today) {
          const puzzle = pickTablePuzzle('daily', s.table, s.level, s.index, now());
          set({ session: { ...s, puzzle, optimalOperands: puzzle.operands, dailyDate: today, dailyTraining: st.dailyDone === today, input: '', feedback: null, hintsUsed: 0 } });
          return;
        }
        if (!s.feedback) return;
      }

      if (s.mode === 'rogue') {
        if (!s.rogue || s.rogue.over || s.draft) return;
        const feedback = s.feedback;
        if (!feedback || feedback.soft) return;
        const won = feedback.ok;
        if (!won && (feedback.reason === 'save_failed' || !breaksStreak(feedback.reason))) return;
        let run = s.rogue;
        if (won) {
          const r = rogueOnSolve(run, 0); run = r.run;
          if (r.shouldDraft) {
            const draft = draftModifiers(Math.random, 3, run.rules);
            if (draft.length > 0) {
              set({ session: { ...s, rogue: run, draft, feedback: null, input: '', hintsUsed: 0 } });
              return;
            }
          }
        } else {
          run = rogueOnFail(run);
          if (run.over) { set({ bestByMode: { ...st.bestByMode, rogue: Math.max(st.bestByMode.rogue ?? 0, run.score) }, session: { ...s, rogue: run, feedback: null } }); save(get); return; }
        }
        const puzzle = pickRoguePuzzle(run.rules);
        if (!puzzle) {
          set({ rogueSelectionFailed: true, session: stopRogueSelection(s, run) });
          return;
        }
        const optimalOperands = puzzle.operands;
        set({ session: { ...s, rogue: run, rules: run.rules, puzzle, optimalOperands, input: '', feedback: null, hintsUsed: 0 } });
        return;
      }

      if (s.mode === 'classic') {
        const advance = s.feedback?.canAdvance === true;
        const index = advance ? Math.min(s.index + 1, classicCurriculum(s.table, 100).length - 1) : s.index;
        if (advance) set({ classicProgress: Math.max(st.classicProgress, index) });
        const puzzle = pickTablePuzzle('classic', s.table, s.level, index);
        const optimalOperands = puzzle.operands;
        set({ session: { ...s, index, puzzle, optimalOperands, input: '', feedback: null, hintsUsed: 0 } });
        if (advance) save(get);
        return;
      }

      if (s.mode === 'daily') {
        const puzzle = pickTablePuzzle('daily', s.table, s.level, s.index, now());
        set({ session: { ...s, index: s.index + 1, puzzle, optimalOperands: puzzle.operands, dailyTraining: st.dailyDone === s.dailyDate, input: '', feedback: null, hintsUsed: 0 } });
        return;
      }

      let { level, fails } = s; let index = s.index;
      if (s.mode === 'freeskill') { level = adjustLevel(level, s.streak, fails); fails = 0; }
      else index = s.index + 1;
      const puzzle = pickTablePuzzle(s.mode, s.table, level, index);
      const optimalOperands = puzzle.operands;
      const maxSeconds = s.mode === 'freeskill' ? FREE_BASE_SECONDS + (level - 1) * 8 : 0;
      set({ session: { ...s, level, fails, index, puzzle, optimalOperands, input: '', feedback: null, hintsUsed: 0, secondsLeft: maxSeconds, maxSeconds } });
    },

    chooseModifier(mod) {
      const s = get().session; if (!s || !s.rogue || s.rogue.over) return;
      const offered = s.draft?.find((candidate) => candidate.id === mod.id);
      if (!offered || !isModifierCompatible(s.rogue.rules, offered)) return;
      const run = applyModifier(s.rogue, offered);
      const puzzle = pickRoguePuzzle(run.rules);
      if (!puzzle) {
        // Keep the last valid rules and rewards if the candidate cannot produce a puzzle.
        set({ rogueSelectionFailed: true, session: stopRogueSelection(s, s.rogue) });
        return;
      }
      const optimalOperands = puzzle.operands;
      set({ session: { ...s, rogue: run, rules: run.rules, puzzle, optimalOperands, input: '', feedback: null, draft: null, hintsUsed: 0 } });
    },

    quit() { set({ session: null, rogueSelectionFailed: false }); },
    async fetchLeaderboard(mode, limit = 50) { return leaderboard ? leaderboard.top(mode, limit) : []; },
  }));
}
