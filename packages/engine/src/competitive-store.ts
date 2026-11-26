import { create } from 'zustand';
import type { Storage } from './persistence';
import { makeDeviceId } from './leaderboard';
import { CompetitionError, isCompetitionReply, type CompetitionApi, type CompetitionEvent, type CompetitionReply } from './competitive-types';

export type CompetitionStatus = 'idle' | 'ready' | 'syncing' | 'accepted' | 'rejected' | 'offline' | 'unavailable';
export const COMPETITION_MESSAGES: Record<CompetitionStatus, string> = {
  idle: 'Le classement local reste disponible sans connexion.', ready: 'Défi Daily émis par le serveur.',
  syncing: 'Synchronisation…', accepted: 'Score accepté et confirmé par le serveur.',
  rejected: 'Réponse ou soumission refusée. Aucune récompense compétitive ajoutée.',
  offline: 'Connexion ou service indisponible. Tu peux réessayer la même demande.',
  unavailable: 'Classement compétitif indisponible. Le jeu local reste accessible.',
};
const KEY = 'mathprime:competition:v1';
interface SavedCompetition { pending: CompetitionEvent | null; confirmedBest: number; }
interface CompetitionState extends SavedCompetition {
  reply: CompetitionReply | null; status: CompetitionStatus; hydrated: boolean;
  hydrate(): Promise<void>; start(): Promise<void>; hint(): Promise<void>; answer(expression: string): Promise<void>;
  retry(): Promise<void>;
}

export function createCompetitionStore(api: CompetitionApi | undefined, storage: Storage, optedIn: () => boolean, pseudo: () => string) {
  let inFlight: Promise<void> | null = null;
  return create<CompetitionState>((set, get) => {
    const fail = (error: unknown) => set({ status: error instanceof CompetitionError && !error.retryable ? 'rejected' : 'offline' });
    const run = (work: () => Promise<void>) => {
      if (inFlight) return inFlight;
      if (!optedIn() || !api) { set({ status: 'unavailable' }); return Promise.resolve(); }
      set({ status: 'syncing' });
      inFlight = work().catch(fail).finally(() => { inFlight = null; });
      return inFlight;
    };
    async function deliver(event: CompetitionEvent) {
      try {
        const reply = await api!.send(event);
        if (!isCompetitionReply(reply)) throw new CompetitionError('invalid_response', true);
        const confirmedBest = reply.confirmedBest;
        await storage.set(KEY, { pending: null, confirmedBest });
        set({ reply, pending: null, confirmedBest, status: reply.outcome?.ok ? 'accepted' : reply.outcome ? 'rejected' : 'ready' });
      } catch (error) {
        if (error instanceof CompetitionError && !error.retryable) {
          await storage.set(KEY, { pending: null, confirmedBest: get().confirmedBest });
          set({ pending: null });
        }
        throw error;
      }
    }
    const event = (action: 'hint' | 'answer', expression?: string) => run(async () => {
      if (get().pending) throw new CompetitionError('pending_request', true);
      const challenge = get().reply?.challenge;
      if (!challenge || challenge.rewarded) throw new CompetitionError('no_active_challenge', false);
      const pending: CompetitionEvent = { action, runId: challenge.id, eventId: makeDeviceId(), version: challenge.version, pseudo: pseudo().trim().slice(0, 16) || 'joueur', ...(expression !== undefined ? { expression } : {}) };
      await storage.set(KEY, { pending, confirmedBest: get().confirmedBest });
      set({ pending });
      await deliver(pending);
    });
    return {
      reply: null, pending: null, confirmedBest: 0, status: api ? 'idle' : 'unavailable', hydrated: false,
      async hydrate() {
        if (get().hydrated) return;
        const saved = await storage.get<SavedCompetition>(KEY);
        const pending = saved?.pending;
        const validPending = pending && (pending.action === 'hint' || pending.action === 'answer') && typeof pending.runId === 'string' && typeof pending.eventId === 'string' && Number.isSafeInteger(pending.version) && typeof pending.pseudo === 'string';
        set({ hydrated: true, pending: validPending ? pending : null, confirmedBest: Number.isSafeInteger(saved?.confirmedBest) && saved!.confirmedBest >= 0 ? saved!.confirmedBest : 0, ...(validPending ? { status: 'offline' } : {}) });
      },
      start: () => run(async () => {
        await get().hydrate();
        if (get().pending) throw new CompetitionError('pending_request', true);
        const reply = await api!.start();
        if (!isCompetitionReply(reply)) throw new CompetitionError('invalid_response', true);
        const confirmedBest = reply.confirmedBest;
        await storage.set(KEY, { pending: null, confirmedBest });
        set({ reply, confirmedBest, status: reply.challenge.rewarded ? 'accepted' : 'ready' });
      }),
      hint: () => event('hint'),
      answer: (expression) => event('answer', expression),
      retry: () => run(async () => {
        await get().hydrate();
        if (get().pending) await deliver(get().pending!);
        else set({ status: get().reply ? 'ready' : 'idle' });
      }),
    };
  });
}
