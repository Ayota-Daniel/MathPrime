import type { SessionFormat } from './session';

export function parseOptions(argumentsList: string[]): { format: SessionFormat; seed: number; help: boolean } {
  if (argumentsList.length === 1 && argumentsList[0] === '--help') return { format: 'full', seed: 42, help: true };
  let format: SessionFormat = 'full';
  let seed = 42;
  for (let index = 0; index < argumentsList.length; index += 2) {
    const option = argumentsList[index];
    const value = argumentsList[index + 1];
    if (option === '--format' && (value === 'short' || value === 'full')) format = value;
    else if (option === '--seed' && /^\d+$/.test(value ?? '') && Number.isSafeInteger(Number(value)) && Number(value) <= 0xffffffff) seed = Number(value);
    else throw new Error('Option invalide. Utilisez --help.');
  }
  return { format, seed, help: false };
}
