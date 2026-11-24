import { useEffect, useRef, useState } from "react";
import {
  Check,
  Delete,
  Lightbulb,
  Play,
  RotateCcw,
  ShieldAlert,
  Swords,
} from "lucide-react";
import { evaluate } from "@shortest/engine";
import { editExpression } from "@shortest/engine/rogue-v1";
import type { ExpressionAction, Rules } from "@shortest/engine/rogue-v1";
import { Button } from "../ui";
import { ActiveEffects } from "./RogueCards";
import type { RogueView, WebAction, WebPuzzle } from "../../rogue/controller";

export const BOSS_NAMES = [
  "Le Gardien du rythme",
  "Le Maître des opérations",
  "L’Architecte des nombres",
];
export function encounterName(view: RogueView): string {
  if (view.phase.survival) return `Survie · rencontre ${view.phase.survival}`;
  return view.phase.boss
    ? `Boss ${view.phase.act} · phase ${view.phase.index + 1}`
    : `Acte ${view.phase.act} · puzzle ${view.phase.index + 1} sur 3`;
}
function PuzzleConstraints({ puzzle }: { puzzle: WebPuzzle }) {
  const constraints = Object.entries(puzzle.rules.minimumOccurrences)
    .filter(([, count]) => count > 0)
    .map(([digit, count]) => `Au moins ${count} fois le chiffre ${digit}`);
  if (puzzle.rules.requireSubtraction)
    constraints.push("Au moins une soustraction");
  if (puzzle.rules.maxMultiplications !== null)
    constraints.push(
      `Au maximum ${puzzle.rules.maxMultiplications} multiplication(s)`,
    );
  if (puzzle.minimumStars > 1)
    constraints.push(
      `Au moins ${puzzle.minimumStars} étoiles : un seul chiffre de plus que le minimum`,
    );
  if (!constraints.length) return null;
  return (
    <ul className="rogue-constraints" aria-label="Contraintes de cette épreuve">
      {constraints.map((constraint) => (
        <li key={constraint}>
          <ShieldAlert size={16} aria-hidden="true" />
          {constraint}
        </li>
      ))}
    </ul>
  );
}
export function PuzzleRules({
  puzzle,
  showBaseRules = false,
}: {
  puzzle: WebPuzzle;
  showBaseRules?: boolean;
}) {
  return (
    <div className="rogue-rules">
      <p>
        <strong>{puzzle.rules.numbers.join(" · ")}</strong>
        <span>
          avec{" "}
          {puzzle.rules.operations
            .map((op) => (op === "*" ? "×" : op === "-" ? "−" : "+"))
            .join("  ")}
        </span>
      </p>
      <details open={showBaseRules}>
        <summary>Règles de base</summary>
        <small>
          Chiffres réutilisables. Sans parenthèses, multiplication prioritaire.
          Visez une expression courte.
        </small>
      </details>
      <PuzzleConstraints puzzle={puzzle} />
    </div>
  );
}
/** Short labels for the chips under the target, as on mobile. */
function compactConstraints(puzzle: WebPuzzle): string[] {
  const rules = puzzle.rules;
  const labels = Object.entries(rules.minimumOccurrences)
    .filter(([, count]) => count > 0)
    .map(([digit, count]) => `${digit} : au moins ${count}`);
  if (rules.requireSubtraction) labels.push("Soustraction requise");
  if (rules.maxMultiplications !== null)
    labels.push(`× : maximum ${rules.maxMultiplications}`);
  if (puzzle.minimumStars > 1)
    labels.push(`Minimum ${puzzle.minimumStars} étoiles`);
  return labels;
}
function LiveTarget({ view, puzzle }: { view: RogueView; puzzle: WebPuzzle }) {
  if (puzzle.state !== "playing") return null;
  const fraction =
    puzzle.seconds > 0
      ? Math.max(0, Math.min(1, view.remaining / puzzle.seconds))
      : 0;
  const critical = view.remaining <= 5;
  return (
    <>
      <div className="rogue-target-card">
        <span className="rogue-target-label">Cible</span>
        <strong className="rogue-target-number">{puzzle.target}</strong>
        <div
          role="timer"
          aria-label={`${view.remaining} secondes restantes`}
          className={`rogue-time${critical ? " critical" : ""}`}
        >
          <span className="rogue-time-track" aria-hidden="true">
            <span style={{ width: `${fraction * 100}%` }} />
          </span>
          <b aria-hidden="true">{view.remaining} s</b>
        </div>
        {critical && (
          <p className="sr-only" role="status">
            Temps critique
          </p>
        )}
      </div>
      <ul className="rogue-chips" aria-label="Règles de cette épreuve">
        <li>Sans parenthèses</li>
        <li>× avant + et −</li>
        {compactConstraints(puzzle).map((label) => (
          <li key={label} className="rule">
            {label}
          </li>
        ))}
      </ul>
    </>
  );
}
function RogueKeypad({
  rules,
  busy,
  insert,
}: {
  rules: Rules;
  busy: boolean;
  insert: (token: string) => void;
}) {
  return (
    <div className="rogue-keypad">
      {rules.numbers.map((digit) => (
        <Button
          key={digit}
          type="button"
          className="rogue-digit"
          disabled={busy}
          onClick={() => insert(String(digit))}
        >
          {digit}
        </Button>
      ))}
      {rules.operations.map((op) => (
        <Button
          key={op}
          type="button"
          className="rogue-operator"
          disabled={busy}
          onClick={() => insert(op)}
        >
          {op === "*" ? "×" : op === "-" ? "−" : "+"}
        </Button>
      ))}
    </div>
  );
}

function Gap({ value, target }: { value: number; target: number }) {
  if (value === target) return <> · pile sur la cible</>;
  const gap = Math.abs(value - target);
  return (
    <>
      {" "}
      · {gap.toLocaleString("fr-FR")} {value > target ? "de trop" : "à trouver"}
    </>
  );
}
export function RogueExpressionInput({
  rules,
  busy,
  onSubmit,
  onEdit,
  game,
}: {
  rules: Rules;
  busy: boolean;
  onSubmit: (expression: string) => void;
  onEdit?: (expression: string) => void;
  game?: { view: RogueView; send: (action: WebAction) => void };
}) {
  const [input, setInput] = useState("");
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!busy) field.current?.focus({ preventScroll: true });
  }, [busy]);
  function edit(action: ExpressionAction) {
    if (busy) return;
    const start = field.current?.selectionStart ?? input.length;
    const end = field.current?.selectionEnd ?? start;
    const result = editExpression(
      input,
      { start, end },
      action,
      rules.operations,
    );
    setInput(result.text);
    onEdit?.(result.text);
    requestAnimationFrame(() => {
      field.current?.focus({ preventScroll: true });
      field.current?.setSelectionRange(
        result.selection.start,
        result.selection.end,
      );
    });
  }
  const normalized = input
    .replace(/\s/g, "")
    .replace(/×/g, "*")
    .replace(/−/g, "-");
  const complete = /^[357](?:[+*\-][357])*$/.test(normalized);
  const value = complete ? evaluate(normalized) : undefined;
  const digitCount = (input.match(/[0-9]/g) ?? []).length;
  const erase = (
    <Button
      type="button"
      disabled={busy || !input}
      onClick={() => edit({ type: "erase" })}
      icon={<Delete size={19} />}
    >
      Effacer
    </Button>
  );
  const clear = (
    <Button
      type="button"
      disabled={busy || !input}
      onClick={() => edit({ type: "clear" })}
      icon={<RotateCcw size={15} />}
    >
      Vider
    </Button>
  );
  return (
    <form
      className={`rogue-math-entry${game ? " rogue-entry-live" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (input && !busy) onSubmit(input);
      }}
    >
      <div className="rogue-calculation">
        {game?.view.puzzle && (
          <LiveTarget view={game.view} puzzle={game.view.puzzle} />
        )}
        <label htmlFor="rogue-expression">Votre expression</label>
        <input
          ref={field}
          id="rogue-expression"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={150}
          value={input.replace(/\*/g, "×").replace(/-/g, "−")}
          onChange={(event) => {
            setInput(event.target.value);
            onEdit?.(event.target.value);
          }}
          onKeyDown={(event) => {
            if (
              ["+", "-", "*", "×", "−"].includes(event.key) &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              event.preventDefault();
              edit({ type: "insert", token: event.key });
            }
          }}
          placeholder="À vous de jouer…"
          aria-describedby="rogue-expression-help"
          disabled={busy}
        />
        <div id="rogue-expression-help" className="rogue-input-help">
          <span>
            {game ? "vaut" : "Valeur :"}{" "}
            <strong>{value ?? "—"}</strong>
            {game?.view.puzzle?.state === "playing" &&
              value !== undefined && (
                <Gap value={value} target={game.view.puzzle.target} />
              )}
          </span>
          <span>
            {game
              ? `${digitCount} chiffre${digitCount > 1 ? "s" : ""}`
              : "Entrée pour valider"}
          </span>
        </div>
        {!game && (
          <div className="rogue-input-tools">
            {erase}
            {clear}
          </div>
        )}
      </div>
      <div className="rogue-controls">
        <RogueKeypad
          rules={rules}
          busy={busy}
          insert={(token) => edit({ type: "insert", token })}
        />
        {game && (
          <div className="rogue-edit-row">
            {erase}
            {clear}
            <Button
              type="button"
              className="rogue-hint-button"
              disabled={busy || game.view.hints === 0}
              icon={<Lightbulb size={20} />}
              aria-describedby="rogue-hint-cost"
              onClick={() => game.send({ type: "hint" })}
            >
              Indice
            </Button>
          </div>
        )}
        <Button
          type="submit"
          aria-label="Valider ma réponse"
          variant="primary"
          className="w-full"
          disabled={busy || !input}
          icon={<Check size={18} />}
        >
          Valider
        </Button>
        {game && (
          <div className="rogue-hints">
            <small id="rogue-hint-cost">
              Indice partiel · −15 % au score de ce puzzle. Le temps continue.
            </small>
            <ul aria-live="polite">
              {game.view.hintMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        {game && (
          <p className="rogue-footnote">
            Une réponse définitive incorrecte coûte une vie. Les erreurs de
            syntaxe ne sont pas soumises.
          </p>
        )}
      </div>
      {game && <ActiveEffects effects={game.view.effects} rules={rules} />}
    </form>
  );
}
export function RoguePuzzle({
  view,
  busy,
  send,
}: {
  view: RogueView;
  busy: boolean;
  send: (action: WebAction) => void;
}) {
  const puzzle = view.puzzle!;
  const preparing = puzzle.state === "preparation";
  const boss = view.phase.boss;
  const bossCopy = [
    "En première phase, une solution optimale donne 8 secondes de plus à la prochaine tentative de phase 2.",
    "Les opérations changent la donne. Chaque phase ajoute une obligation compatible avec vos cartes.",
    "Le build, la précision, puis la pression : trois phases pour une victoire officielle.",
  ];
  if (!preparing) {
    return (
      <section
        className="rogue-puzzle-panel rogue-live"
        aria-labelledby="rogue-title"
      >
        <div className={boss ? "rogue-puzzle-heading" : "sr-only"}>
          <h1 id="rogue-title" tabIndex={-1}>
            {boss ? BOSS_NAMES[view.phase.act - 1] : encounterName(view)}
          </h1>
          {boss && <span className="rogue-kicker">{encounterName(view)}</span>}
        </div>
        <RogueExpressionInput
          key={`${view.seed}-${view.stage}`}
          rules={puzzle.rules}
          busy={busy}
          onSubmit={(expression) => send({ type: "submit", expression })}
          game={{ view, send }}
        />
      </section>
    );
  }
  return (
    <section
      className={`rogue-puzzle-panel${boss ? " rogue-boss-panel" : ""}${preparing && !puzzle.introduction ? " rogue-short-preparation" : ""}`}
      aria-labelledby="rogue-title"
    >
      <div className="rogue-puzzle-heading">
        <span className="rogue-kicker">
          {boss ? (
            <Swords size={16} aria-hidden="true" />
          ) : (
            <span className="rogue-spark">✦</span>
          )}
          {encounterName(view)}
        </span>
        <span className="rogue-timer-label">
          {preparing ? "Chronomètre en pause" : "Chronomètre actif"}
        </span>
      </div>
      <h1 id="rogue-title" tabIndex={-1}>
        {boss
          ? BOSS_NAMES[view.phase.act - 1]
          : preparing
            ? puzzle.introduction === "run"
              ? "Prêt pour votre run ?"
              : "Prochaine épreuve."
            : "Atteignez la cible."}
      </h1>
      {preparing && boss && puzzle.introduction === "boss" && (
        <p className="rogue-boss-copy">{bossCopy[view.phase.act - 1]}</p>
      )}
      {preparing && puzzle.introduction === "act" && (
        <p>Acte {view.phase.act}. Découvrez les contraintes de cette étape.</p>
      )}
      {preparing && puzzle.introduction === "survival" && (
        <p>
          Votre victoire est acquise. La survie ajoute progressivement de la
          pression.
        </p>
      )}
      {preparing && puzzle.introduction === "changes" && (
        <p>
          Votre build ou vos contraintes ont changé. Vérifiez-les avant de
          partir.
        </p>
      )}
      <p className="rogue-hidden-target">
        Cible masquée jusqu’au démarrage du chronomètre.
      </p>
      <PuzzleRules
        puzzle={puzzle}
        showBaseRules={preparing && puzzle.introduction === "run"}
      />
      <div className="rogue-prepare">
        <p>
          Vous avez{" "}
          <strong>
            {puzzle.seconds.toLocaleString("fr-FR", {
              maximumFractionDigits: 2,
            })}{" "}
            secondes
          </strong>
          . Le temps commencera au clic.
        </p>
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          icon={<Play size={18} />}
          onClick={() => send({ type: "start" })}
        >
          {boss ? "Affronter cette phase" : "Commencer le puzzle"}
        </Button>
      </div>
    </section>
  );
}
