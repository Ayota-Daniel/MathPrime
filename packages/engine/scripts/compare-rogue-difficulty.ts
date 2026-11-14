import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Generator } from "../src/rogue-v1/generator";
import { simulate, POLICY_PARAMETERS } from "../src/rogue-v1/simulator";
import { analyzeDifficulty } from "../src/rogue-v1/difficulty-analysis";
import type { GenerationProfile } from "../src/rogue-v1/difficulty";

const args = process.argv.slice(2);
function option(name: string, fallback: string) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
for (let index = 0; index < args.length; index += 2)
  if (
    !["--runs", "--seed", "--survival", "--out"].includes(args[index]) ||
    !args[index + 1]
  )
    throw new Error("Invalid comparison options");
const runs = Number(option("--runs", "300"));
const seed = Number(option("--seed", "42"));
const survivalPuzzles = Number(option("--survival", "4"));
const profiles: GenerationProfile[] = ["legacy", "r4.2"];
const results = [];
for (const profile of profiles)
  for (const policy of ["prudent", "equilibre", "temeraire"] as const) {
    const times: number[] = [];
    const original = Generator.prototype.generate;
    Generator.prototype.generate = function (...parameters) {
      const start = performance.now();
      const result = original.apply(this, parameters);
      times.push(performance.now() - start);
      return result;
    };
    const start = performance.now();
    let report;
    try {
      report = simulate({
        seed,
        runs,
        policy,
        survivalPuzzles,
        generationProfile: profile,
      });
    } finally {
      Generator.prototype.generate = original;
    }
    const elapsedMs = performance.now() - start;
    const metrics = analyzeDifficulty(report.runs);
    const mathematics = {
      profile,
      policy,
      summary: report.summary,
      metrics,
      generator: report.generator,
      refusals: report.diagnostics.refusals,
    };
    times.sort((a, b) => a - b);
    const result = {
      ...mathematics,
      digest: createHash("sha256")
        .update(JSON.stringify(mathematics))
        .digest("hex"),
      performance: {
        elapsedMs,
        generated: times.length,
        meanMs: times.reduce((a, b) => a + b, 0) / (times.length || 1),
        p95Ms: times[Math.floor(times.length * 0.95)] ?? 0,
        maximumMs: times[times.length - 1] ?? 0,
      },
    };
    results.push(result);
    console.log(
      JSON.stringify({
        profile,
        policy,
        blocked: result.summary.blocked,
        digest: result.digest,
        progression: metrics.acts.slice(0, 3).map((act) => act.operands.mean),
        redundantRepeats: metrics.redundantAcrossRun,
        elapsedMs,
      }),
    );
  }
const output = {
  schemaVersion: 1,
  parameters: {
    seed,
    runsPerPolicy: runs,
    survivalPuzzles,
    policies: POLICY_PARAMETERS,
  },
  environment: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
  },
  disclaimer:
    "Agents synthétiques avec accès aux témoins. Aucune difficulté humaine validée. Chronométrage local avec caches ; analyse séparée. Même seeds et politiques, pas des puzzles identiques.",
  results,
};
writeFileSync(
  option("--out", "docs/R4.2-rogue-comparison.json"),
  JSON.stringify(output, null, 2) + "\n",
);
