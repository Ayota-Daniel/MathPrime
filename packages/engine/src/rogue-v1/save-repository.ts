import type { Storage } from "../persistence";
import { ROGUE_SAVE_KEY } from "./saved-session";
import type { RogueSave } from "./saved-session";
import {
  appendArchives,
  parseRogueStore,
  ROGUE_STORE_KEY,
} from "./run-history";
import type { RogueStore, RunArchive } from "./run-history";
export { ROGUE_STORE_KEY, MAX_ROGUE_ARCHIVES } from "./run-history";
export type { RunArchive } from "./run-history";

export interface RogueStorage {
  storage: Storage;
  exclusive<T>(work: () => Promise<T>): Promise<T>;
}
/** Session and bounded summaries share one atomic replacement, under the platform lock. */
export class RogueSaveRepository {
  private expected: string | undefined;
  private store: RogueStore = {
    version: 1,
    active: null,
    activeArchived: false,
    archives: [],
  };
  constructor(private readonly adapter: RogueStorage) {}
  history(): RunArchive[] {
    return JSON.parse(JSON.stringify(this.store.archives));
  }
  activeArchived(): boolean {
    return this.store.activeArchived;
  }
  async load(): Promise<unknown> {
    return this.adapter.exclusive(async () => {
      let raw = await this.adapter.storage.get<unknown>(ROGUE_STORE_KEY);
      if (raw === null) {
        const active = await this.adapter.storage.get<unknown>(ROGUE_SAVE_KEY);
        if (active !== null) {
          raw = { version: 1, active, activeArchived: false, archives: [] };
          parseRogueStore(raw);
          await this.adapter.storage.set(ROGUE_STORE_KEY, raw);
        }
      }
      this.store =
        raw === null
          ? { version: 1, active: null, activeArchived: false, archives: [] }
          : parseRogueStore(raw);
      this.expected = JSON.stringify(raw);
      return this.store.active;
    });
  }
  private async replace(next: RogueStore): Promise<void> {
    await this.adapter.exclusive(async () => {
      const current = await this.adapter.storage.get<unknown>(ROGUE_STORE_KEY);
      if (
        this.expected === undefined ||
        JSON.stringify(current) !== this.expected
      )
        throw new Error("save-conflict");
      parseRogueStore(next);
      await this.adapter.storage.set(ROGUE_STORE_KEY, next);
      this.store = next;
      this.expected = JSON.stringify(next);
    });
  }
  async write(save: RogueSave, summaries: RunArchive[] = []): Promise<void> {
    const current = this.store.active as RogueSave | null;
    const added = summaries.filter(
      (summary) => !(summary.id === current?.id && this.store.activeArchived),
    );
    await this.replace({
      version: 1,
      active: save,
      activeArchived:
        (save.id === current?.id && this.store.activeArchived) ||
        added.some((summary) => summary.id === save.id),
      archives: appendArchives(this.store.archives, added),
    });
  }
  async deleteArchive(id: string): Promise<void> {
    await this.replace({
      ...this.store,
      archives: this.store.archives.filter((entry) => entry.id !== id),
    });
  }
}
