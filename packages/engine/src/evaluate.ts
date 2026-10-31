/** evaluate.ts — RUNTIME. Évalue une expression (priorité, sans parenthèses). */
export type Op = '+' | '-' | '*';

export function evaluate(expr: string): number {
  const tokens = expr.match(/\d+|[+\-*]/g);
  if (!tokens) throw new Error(`Expression invalide: "${expr}"`);
  let total = 0;
  let term = parseInt(tokens[0], 10);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i] as Op;
    const n = parseInt(tokens[i + 1], 10);
    if (op === '*') term *= n;
    else if (op === '+') { total += term; term = n; }
    else { total += term; term = -n; }
  }
  return total + term;
}
