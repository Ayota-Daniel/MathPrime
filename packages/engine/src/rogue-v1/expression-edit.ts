import type { Rules } from "./model";
type Operation = Rules["operations"][number];

export interface TextSelection {
  start: number;
  end: number;
}
export interface ExpressionEdit {
  text: string;
  selection: TextSelection;
}
export type ExpressionAction =
  { type: "insert"; token: string } | { type: "erase" } | { type: "clear" };
const normalize = (text: string) => text.replace(/−/g, "-").replace(/×/g, "*");
const operator = (text: string) => ["+", "-", "*"].includes(text);

/** With a caret, replace an adjacent operator; a selection never consumes unselected text. */
export function editExpression(
  text: string,
  selection: TextSelection,
  action: ExpressionAction,
  allowed: readonly Operation[] = ["+", "-", "*"],
): ExpressionEdit {
  let start = Math.max(
    0,
    Math.min(text.length, selection.start, selection.end),
  );
  let end = Math.max(
    start,
    Math.min(text.length, Math.max(selection.start, selection.end)),
  );
  const unchanged = { text, selection: { start, end } };
  if (action.type === "clear")
    return { text: "", selection: { start: 0, end: 0 } };
  const token = action.type === "insert" ? normalize(action.token) : "";
  if (action.type === "erase") {
    if (start === end) start = Math.max(0, start - 1);
  } else {
    if (
      !/^[1-9+*\-]$/.test(token) ||
      (operator(token) && !allowed.includes(token as Operation))
    )
      return unchanged;
    if (operator(token) && start === end) {
      if (start === 0) return unchanged;
      if (operator(normalize(text[start - 1]))) start--;
      else if (operator(normalize(text[start] ?? ""))) end++;
    }
  }
  const next = text.slice(0, start) + token + text.slice(end);
  if (next.length > 150) return unchanged;
  const cursor = start + token.length;
  return { text: next, selection: { start: cursor, end: cursor } };
}

export const EXPRESSION_TUTORIAL = [
  "Saisissez 3 puis + avec le pavé.",
  "Appuyez sur × : il remplace le + juste avant le curseur.",
  "Ajoutez le chiffre 5.",
  "Appuyez sur Effacer pour retirer le 5.",
  "Ajoutez 7, puis validez 3 × 7 = 21.",
  "Bravo ! Vous savez saisir, remplacer un opérateur, effacer et valider.",
];
export function advanceTutorial(
  step: number,
  text: string,
  submitted = false,
): number {
  const expected = ["3+", "3*", "3*5", "3*", "3*7"];
  return step < expected.length &&
    normalize(text) === expected[step] &&
    (step !== 4 || submitted)
    ? step + 1
    : step;
}
