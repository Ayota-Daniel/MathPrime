/** Contrat v1 : aucun score, identifiant joueur ou paramètre de scoring envoyé par le client. */
export interface DailyChallenge {
  id: string; day: string; version: number; target: number; optimalOperands: number;
  difficulty: number; hints: number; hint: string; streak: number; rewarded: boolean;
}
export interface CompetitionReply {
  challenge: DailyChallenge;
  confirmedBest: number;
  outcome?: { ok: boolean; stars: number; gained: number; reason?: string };
}
export interface CompetitionEvent {
  action: 'hint' | 'answer'; runId: string; eventId: string; version: number;
  pseudo: string; expression?: string;
}
export interface VerifiedEntry { id: string; pseudo: string; mode: 'daily'; score: number; at: number; }
export interface CompetitionApi {
  start(): Promise<CompetitionReply>;
  send(event: CompetitionEvent): Promise<CompetitionReply>;
  top(): Promise<VerifiedEntry[]>;
}
export class CompetitionError extends Error {
  constructor(public code: string, public retryable: boolean) { super(code); }
}

export function isCompetitionReply(value: unknown): value is CompetitionReply {
  if (!value || typeof value !== 'object') return false;
  const reply = value as CompetitionReply;
  const c = reply.challenge;
  return !!c && typeof c.id === 'string' && /^[0-9a-f-]{36}$/i.test(c.id) && /^\d{4}-\d{2}-\d{2}$/.test(c.day)
    && [c.version, c.hints, c.streak, c.target, c.optimalOperands, c.difficulty, reply.confirmedBest].every((n) => Number.isSafeInteger(n) && n >= 0)
    && c.target > 0 && c.optimalOperands > 0 && c.difficulty >= 1 && c.difficulty <= 5
    && c.hints <= 256 && reply.confirmedBest <= 1000 && typeof c.hint === 'string' && c.hint.length <= 256 && typeof c.rewarded === 'boolean'
    && (!reply.outcome || (typeof reply.outcome.ok === 'boolean' && Number.isSafeInteger(reply.outcome.gained)
      && reply.outcome.gained >= 0 && reply.outcome.gained <= 1000
      && (reply.outcome.ok ? c.rewarded && reply.outcome.gained > 0 && reply.confirmedBest >= reply.outcome.gained : reply.outcome.gained === 0) && Number.isInteger(reply.outcome.stars) && reply.outcome.stars >= 0 && reply.outcome.stars <= 3));
}
