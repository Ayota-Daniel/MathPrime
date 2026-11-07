import { CARDS, DEFAULT_CONFIG, Generator, phaseAt } from '../src/rogue-v1';
import type { CardId, Effect } from '../src/rogue-v1';

const generator = new Generator();
const oldConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as typeof DEFAULT_CONFIG;
// Historical erroneous configuration, used only as an explicit comparison fixture.
oldConfig.rules.numbers = [2, 3, 7];
const builds: CardId[][] = [[], ...(Object.keys(CARDS) as CardId[]).map(id => [id]),
  ['D1', 'D2'], ['D1', 'T3'], ['D1', 'D2', 'T3']];
const rows = builds.flatMap(ids => Array.from({ length: 22 }, (_, stage) => {
  const effects: Effect[] = ids.map(id => ({ id, remaining: CARDS[id].duration, level: 1, shieldUsed: false }));
  const before = generator.pool(oldConfig, effects, phaseAt(stage, oldConfig));
  const after = generator.pool(DEFAULT_CONFIG, effects, phaseAt(stage, DEFAULT_CONFIG));
  return { cards: ids, stage, before: before.candidates.length, after: after.candidates.length, diagnostics: after.diagnostics };
}));
console.log(JSON.stringify({
  note: 'Static level-one builds kept active across all probes, including temporary effects. Identical search bounds; not identical puzzles.',
  rows,
}, null, 2));
