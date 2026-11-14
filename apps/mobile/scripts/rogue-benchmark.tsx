// Separate, storage-free Android entry point. Never use this as the production entry.
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { registerRootComponent } from "expo";
import {
  Generator,
  DEFAULT_CONFIG,
  phaseAt,
  simulate,
} from "@shortest/engine/rogue-v1";
import type { Effect } from "@shortest/engine/rogue-v1";

// Hermes provides this timer; the native TypeScript config intentionally excludes DOM types.
declare const performance: { now(): number };

function measure() {
  const results = [];
  for (const profile of ["legacy", "r4.2"] as const) {
    const times: number[] = [];
    const generator = new Generator(profile);
    const builds: Effect[][] = [
      [],
      [
        { id: "D1", level: 1, remaining: null, shieldUsed: false },
        { id: "D2", level: 2, remaining: null, shieldUsed: false },
        { id: "T3", level: 1, remaining: 3, shieldUsed: false },
      ],
    ];
    let refused = 0;
    for (const effects of builds)
      for (let stage = 0; stage < 20; stage++) {
        const start = performance.now();
        const generated = generator.generate(
          DEFAULT_CONFIG,
          effects,
          phaseAt(stage, DEFAULT_CONFIG),
          0.42,
          0,
          null,
        );
        times.push(performance.now() - start);
        if (!generated.puzzle) refused++;
      }
    times.sort((a, b) => a - b);
    const campaignStart = performance.now();
    const campaign = simulate({
      seed: 42,
      runs: 3,
      policy: "equilibre",
      survivalPuzzles: 4,
      generationProfile: profile,
    });
    results.push({
      profile,
      calls: times.length,
      refused,
      maximumSearchStates: generator.maximumSearchStates,
      meanMs: times.reduce((a, b) => a + b, 0) / times.length,
      p95Ms: times[Math.floor(times.length * 0.95)],
      maximumMs: times[times.length - 1],
      threeRunsMs: performance.now() - campaignStart,
      blockedRuns: campaign.summary.blocked,
    });
  }
  return { runtime: "Android Hermes, release, x86_64 emulator", results };
}
function Benchmark() {
  const [result, setResult] = useState("Mesure Android en cours…");
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        const report = JSON.stringify(measure());
        console.info(`ROGUE_BENCHMARK ${report}`);
        setResult(report);
      } catch (error) {
        setResult(String(error));
      }
    }, 500);
    return () => clearTimeout(handle);
  }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text selectable>{result}</Text>
    </ScrollView>
  );
}
registerRootComponent(Benchmark);
