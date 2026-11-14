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
import { Button, Tile } from "../ui";
import { TimerBar } from "../TimerBar";
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
export function PuzzleRules({
  puzzle,
  showBaseRules = false,
}: {
  puzzle: WebPuzzle;
  showBaseRules?: boolean;
}) {
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
      {constraints.length > 0 && (
        <ul aria-label="Contraintes de cette épreuve">
          {constraints.map((constraint) => (
            <li key={constraint}>
              <ShieldAlert size={15} aria-hidden="true" />
              {constraint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function RogueExpressionInput({
  rules,
  busy,
  onSubmit,
  onEdit,
  practice = false,
}: {
  rules: Rules;
  busy: boolean;
  onSubmit: (expression: string) => void;
  onEdit?: (expression: string) => void;
  practice?: boolean;
}) {
  const [input, setInput] = useState("");
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setInput("");
    field.current?.focus();
  }, []);
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
      field.current?.focus();
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
  return (
    <form
      className="rogue-math-entry"
      onSubmit={(event) => {
        event.preventDefault();
        if (input && !busy) onSubmit(input);
      }}
    >
      <label htmlFor="rogue-expression">Votre expression</label>
      <input
        ref={field}
        id="rogue-expression"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={150}
        value={input}
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
          Valeur : <strong>{complete ? evaluate(normalized) : "—"}</strong>
        </span>
        <span>Entrée pour valider</span>
      </div>
      <div className="rogue-keypad">
        {rules.numbers.map((digit) => (
          <Tile
            key={digit}
            label={String(digit)}
            kind="num"
            disabled={busy}
            onPress={() => {
              if (!busy) edit({ type: "insert", token: String(digit) });
            }}
          />
        ))}
        {rules.operations.map((op) => (
          <Tile
            key={op}
            label={op === "*" ? "×" : op === "-" ? "−" : "+"}
            kind="op"
            disabled={busy}
            onPress={() => {
              if (!busy) edit({ type: "insert", token: op });
            }}
          />
        ))}
      </div>
      <div className="rogue-input-tools">
        <Button
          type="button"
          disabled={busy || !input}
          onClick={() => edit({ type: "erase" })}
          icon={<Delete size={16} />}
        >
          Effacer
        </Button>
        <Button
          type="button"
          disabled={busy || !input}
          onClick={() => edit({ type: "clear" })}
          icon={<RotateCcw size={15} />}
        >
          Vider
        </Button>
      </div>
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={busy || !input}
        icon={<Check size={18} />}
      >
        Valider ma réponse
      </Button>
      {!practice && (
        <p className="rogue-footnote">
          Une réponse définitive incorrecte coûte une vie. Les erreurs de
          syntaxe ne sont pas soumises.
        </p>
      )}
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
      {puzzle.state === "playing" ? (
        <div className="rogue-target">
          <span>Cible à atteindre</span>
          <strong>{puzzle.target}</strong>
        </div>
      ) : (
        <p className="rogue-hidden-target">
          Cible masquée jusqu’au démarrage du chronomètre.
        </p>
      )}
      <PuzzleRules
        puzzle={puzzle}
        showBaseRules={preparing && puzzle.introduction === "run"}
      />
      {preparing ? (
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
      ) : (
        <>
          <div
            role="timer"
            aria-label={`${view.remaining} secondes restantes`}
            className="rogue-timer"
          >
            <TimerBar
              secondsLeft={view.remaining}
              maxSeconds={puzzle.seconds}
            />
          </div>
          {view.remaining <= 5 && (
            <p className="rogue-urgent" role="status">
              Il reste moins de six secondes.
            </p>
          )}
          <RogueExpressionInput
            key={`${view.seed}-${view.stage}`}
            rules={puzzle.rules}
            busy={busy}
            onSubmit={(expression) => send({ type: "submit", expression })}
          />
          <div className="rogue-hints">
            <Button
              disabled={busy || view.hints === 0}
              icon={<Lightbulb size={17} />}
              onClick={() => send({ type: "hint" })}
            >
              Indice partiel · {view.hints} restant{view.hints > 1 ? "s" : ""}
            </Button>
            <small>
              −15 % au score de ce puzzle par indice. Le temps continue.
            </small>
            <ul aria-live="polite">
              {view.hintMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
