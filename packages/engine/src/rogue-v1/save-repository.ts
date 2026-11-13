import type { Storage } from "../persistence";
import { ROGUE_SAVE_KEY } from "./saved-session";
import type { RogueSave } from "./saved-session";

export interface RogueStorage {
  storage: Storage;
  exclusive<T>(work: () => Promise<T>): Promise<T>;
}
/** One atomic value per local profile; compare-and-write is protected by the platform lock. */
export class RogueSaveRepository {
  private expected: string | undefined;
  constructor(private readonly adapter: RogueStorage) {}
  async load(): Promise<unknown> {
    return this.adapter.exclusive(async () => {
      const raw = await this.adapter.storage.get<unknown>(ROGUE_SAVE_KEY);
      this.expected = JSON.stringify(raw);
      return raw;
    });
  }
  async write(save: RogueSave): Promise<void> {
    await this.adapter.exclusive(async () => {
      const current = await this.adapter.storage.get<unknown>(ROGUE_SAVE_KEY);
      if (
        this.expected === undefined ||
        JSON.stringify(current) !== this.expected
      )
        throw new Error("save-conflict");
      await this.adapter.storage.set(ROGUE_SAVE_KEY, save);
      this.expected = JSON.stringify(save);
    });
  }
}
