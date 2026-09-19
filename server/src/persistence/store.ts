import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Room, Session } from '../rooms/types.js';

/** Everything that must survive a process restart. */
export interface Snapshot {
  readonly version: 1;
  readonly rooms: Room[];
  readonly sessions: Session[];
}

const DEFAULT_PATH = resolve(process.cwd(), '.data/state.json');

/**
 * A durable snapshot of room and session state, written to a JSON file.
 *
 * Writes are coalesced: calling `save` repeatedly within `debounceMs` results
 * in a single write of the latest snapshot. Writes go to a temporary file and
 * are renamed into place, so a crash mid-write cannot truncate the snapshot.
 */
export class SnapshotStore {
  private pending: NodeJS.Timeout | null = null;
  private latest: Snapshot | null = null;
  private writing: Promise<void> = Promise.resolve();

  /**
   * Params:
   *   path: snapshot file location. Defaults to `.data/state.json` under the
   *     process working directory.
   *   debounceMs: how long to coalesce successive `save` calls.
   */
  constructor(
    private readonly path: string = process.env.BIGTWO_STATE_PATH ?? DEFAULT_PATH,
    private readonly debounceMs = 250,
  ) {}

  /**
   * Reads the snapshot written by a previous run.
   *
   * Returns: the stored snapshot, or `null` when no readable snapshot exists
   *   (first boot, or a file that is missing or corrupt).
   */
  async load(): Promise<Snapshot | null> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as Snapshot;
      return parsed.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Schedules a write of `snapshot`, replacing any write not yet flushed.
   *
   * Params:
   *   snapshot: state to persist. Retained by reference until flushed, so do
   *     not mutate it afterwards.
   */
  save(snapshot: Snapshot): void {
    this.latest = snapshot;
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      void this.flush();
    }, this.debounceMs);
  }

  /** Writes any pending snapshot immediately and waits for it to land. */
  async flush(): Promise<void> {
    if (this.pending) {
      clearTimeout(this.pending);
      this.pending = null;
    }
    const snapshot = this.latest;
    if (!snapshot) return;
    this.latest = null;
    this.writing = this.writing.then(() => this.write(snapshot));
    await this.writing;
  }

  private async write(snapshot: Snapshot): Promise<void> {
    const temporary = `${this.path}.${process.pid}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(temporary, JSON.stringify(snapshot), 'utf8');
      await rename(temporary, this.path);
    } catch (error) {
      console.error('[persistence] snapshot write failed', error);
    }
  }
}
