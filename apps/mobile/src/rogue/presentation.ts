import { CARDS, MAJOR_UPGRADES } from "@shortest/engine/rogue-v1";
import type { CardId, Effect, Offer } from "@shortest/engine/rogue-v1";
import type { RoguePuzzleView } from "@shortest/engine/rogue-v1/controller";
export const BOSS_NAMES = [
  "Le Gardien du rythme",
  "Le Maître des opérations",
  "L’Architecte des nombres",
];
export function cardDescription(id: CardId, level = 1) {
  const terms =
    level > 1 && id in MAJOR_UPGRADES
      ? MAJOR_UPGRADES[id as keyof typeof MAJOR_UPGRADES]
      : CARDS[id];
  return { name: CARDS[id].name, ...terms };
}
export function effectDuration(id: CardId, remaining = CARDS[id].duration) {
  if (remaining === null) return "Toute la run";
  return `${remaining} ${CARDS[id].expiresOn === "success" ? "réussite(s)" : "tentative(s)"}`;
}
export function offerDescription(offer: Offer, effects: Effect[]) {
  const level =
    offer.kind === "upgrade"
      ? (effects.find((effect) => effect.id === offer.card)?.level ?? 1) + 1
      : 1;
  return {
    ...cardDescription(offer.card, level),
    operation:
      offer.kind === "upgrade"
        ? "Améliorer"
        : offer.kind === "replace"
          ? `Remplace ${offer.replaces} — ${CARDS[offer.replaces!].name}`
          : "Ajouter",
    duration: effectDuration(offer.card),
  };
}
export function constraints(
  puzzle: Pick<RoguePuzzleView, "rules" | "minimumStars">,
): string[] {
  const list = Object.entries(puzzle.rules.minimumOccurrences)
    .filter(([, count]) => count > 0)
    .map(([digit, count]) => `Au moins ${count} fois le chiffre ${digit}`);
  if (puzzle.rules.requireSubtraction) list.push("Au moins une soustraction");
  if (puzzle.rules.maxMultiplications !== null)
    list.push(`Maximum ${puzzle.rules.maxMultiplications} multiplication(s)`);
  if (puzzle.minimumStars > 1)
    list.push(
      `Au moins ${puzzle.minimumStars} étoiles : au maximum un chiffre de plus que le minimum`,
    );
  return list;
}
export function insertToken(
  text: string,
  selection: { start: number; end: number },
  token: string,
) {
  const from = Math.min(text.length, selection.start);
  const to = Math.max(from, Math.min(text.length, selection.end));
  return {
    text: text.slice(0, from) + token + text.slice(to),
    selection: { start: from + token.length, end: from + token.length },
  };
}
