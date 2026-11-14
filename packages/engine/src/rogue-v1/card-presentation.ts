import { CARDS, MAJOR_UPGRADES, multiplicationBudget } from "./cards";
import type { CardId, Difficulty, Rules } from "./model";

export function presentCard(id: CardId, level = 1, rules?: Rules) {
  const terms =
    level > 1 && id in MAJOR_UPGRADES
      ? MAJOR_UPGRADES[id as keyof typeof MAJOR_UPGRADES]
      : CARDS[id];
  return {
    name: CARDS[id].name,
    level,
    ...terms,
    drawback:
      id === "D2"
        ? level > 1
          ? "Une multiplication de moins qu’au niveau I, jusqu’à zéro autorisée."
          : "Le nombre de multiplications est limité selon la difficulté."
        : terms.drawback,
    currentLimit:
      id === "D2" &&
      rules?.maxMultiplications !== null &&
      rules?.maxMultiplications !== undefined
        ? `Cette épreuve : maximum ${rules.maxMultiplications} multiplication(s).`
        : null,
    advanced:
      id === "D2"
        ? "Le générateur conserve des cibles où le budget exclut au moins une solution optimale et limite l’allongement à deux chiffres."
        : null,
  };
}
export function offeredMultiplicationLimit(
  difficulty: Difficulty,
  level: number,
): number {
  return Math.max(0, multiplicationBudget(difficulty) - (level - 1));
}
