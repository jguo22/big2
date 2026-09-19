import { MatchState, Rng } from '@bigtwo/rules';

/**
 * A small deterministic PRNG (mulberry32), so a dealt match can be reproduced.
 *
 * Params:
 *   seed: any 32-bit integer. The same seed always yields the same sequence.
 * Returns: a function producing floats in [0, 1), suitable as `createMatch`'s `rng`.
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The id of the player sitting at `seat`.
 *
 * Raises: `Error` if no player holds that seat.
 */
export function playerAt(state: MatchState, seat: number): string {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (!player) throw new Error(`no player at seat ${seat}`);
  return player.id;
}
