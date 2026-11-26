import { logicalErrors } from "./math";
import { starsFor } from "./cards";
import type { Rules } from "./model";
import { expressionValue } from "./math";

export type RuleViolation =
  | { code: "syntax" | "configuration" }
  | { code: "forbidden-digit"; digit: number; allowed: number[] }
  | { code: "forbidden-operation"; operation: string; allowed: string[] }
  | { code: "digit-required"; digit: number; used: number; required: number }
  | { code: "subtraction-required"; used: number; required: number }
  | {
      code: "multiplication-budget" | "magnitude";
      used: number;
      allowed: number;
    }
  | { code: "wrong-target"; used: number; required: number }
  | {
      code: "stars";
      used: number;
      required: number;
      operands: number;
      maximumOperands: number;
    };

export function expressionViolations(
  expression: string,
  rules: Rules,
  magnitude: number,
): RuleViolation[] {
  if (logicalErrors(rules).length) return [{ code: "configuration" }];
  if (!/^[1-9](?:[+*\-][1-9])*$/.test(expression)) return [{ code: "syntax" }];
  const digits = [...expression.matchAll(/[1-9]/g)].map((match) =>
    Number(match[0]),
  );
  const operations: string[] = expression.match(/[+*\-]/g) ?? [];
  const errors: RuleViolation[] = [];
  for (const digit of new Set(digits))
    if (!rules.numbers.includes(digit))
      errors.push({
        code: "forbidden-digit",
        digit,
        allowed: [...rules.numbers],
      });
  for (const operation of new Set(operations))
    if (!rules.operations.includes(operation as Rules["operations"][number]))
      errors.push({
        code: "forbidden-operation",
        operation,
        allowed: [...rules.operations],
      });
  const used = operations.filter((operation) => operation === "*").length;
  if (rules.maxMultiplications !== null && used > rules.maxMultiplications)
    errors.push({
      code: "multiplication-budget",
      used,
      allowed: rules.maxMultiplications,
    });
  for (const [digit, required] of Object.entries(rules.minimumOccurrences)) {
    const used = digits.filter((value) => value === Number(digit)).length;
    if (used < required)
      errors.push({
        code: "digit-required",
        digit: Number(digit),
        used,
        required,
      });
  }
  if (rules.requireSubtraction && !operations.includes("-"))
    errors.push({ code: "subtraction-required", used: 0, required: 1 });
  let total = 0;
  let term = digits[0];
  let largest = Math.abs(term);
  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index];
    if (operation === "*") term *= digits[index + 1];
    else {
      total += term;
      term = operation === "-" ? -digits[index + 1] : digits[index + 1];
    }
    largest = Math.max(largest, Math.abs(total), Math.abs(term));
  }
  if (largest > magnitude)
    errors.push({ code: "magnitude", used: largest, allowed: magnitude });
  return errors;
}
export function answerViolations(
  expression: string,
  rules: Rules,
  magnitude: number,
  target: number,
  minimumOperands: number,
  minimumStars: number,
): RuleViolation[] {
  const errors = expressionViolations(expression, rules, magnitude);
  if (errors.length) return errors;
  const value = expressionValue(expression);
  if (value !== target)
    return [{ code: "wrong-target", used: value, required: target }];
  const operands = (expression.length + 1) / 2;
  const stars = starsFor(operands, minimumOperands);
  return stars < minimumStars
    ? [
        {
          code: "stars",
          used: stars,
          required: minimumStars,
          operands,
          maximumOperands: minimumOperands + (minimumStars === 2 ? 1 : 0),
        },
      ]
    : [];
}
const symbol = (value: string) =>
  value === "*" ? "×" : value === "-" ? "−" : value;
export function describeViolation(error: RuleViolation): string {
  switch (error.code) {
    case "syntax":
      return "Syntaxe invalide : utilisez des chiffres isolés séparés par une opération, sans parenthèses.";
    case "configuration":
      return "Les règles de cette épreuve sont incohérentes.";
    case "forbidden-digit":
      return `Chiffre ${error.digit} interdit. Chiffres autorisés : ${error.allowed.join(", ")}.`;
    case "forbidden-operation":
      return `Opération ${symbol(error.operation)} interdite. Opérations autorisées : ${error.allowed.map(symbol).join(", ")}.`;
    case "multiplication-budget":
      return `Budget de multiplications dépassé : ${error.used} utilisées, maximum ${error.allowed} autorisée(s).`;
    case "digit-required":
      return `Chiffre ${error.digit} obligatoire : ${error.used} occurrence(s) utilisée(s), au moins ${error.required} requise(s).`;
    case "subtraction-required":
      return "Soustraction obligatoire : 0 utilisée, au moins 1 requise.";
    case "magnitude":
      return `Calcul intermédiaire hors limite : ${error.used} en valeur absolue, maximum ${error.allowed}.`;
    case "wrong-target":
      return `Votre expression vaut ${error.used} ; la cible est ${error.required}.`;
    case "stars":
      return `Précision insuffisante : ${error.used} étoile(s), ${error.required} requise(s). Vous avez utilisé ${error.operands} chiffres ; maximum ${error.maximumOperands} pour cette épreuve.`;
  }
}
