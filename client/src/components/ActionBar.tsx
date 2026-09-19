import { Button } from '@chakra-ui/react';

export interface ActionBarProps {
  /** Whether it is the local player's turn. */
  isYourTurn: boolean;
  /** Why the current selection cannot be played, or `null` when it can. */
  blockedReason: string | null;
  selectionCount: number;
  /** True when the local player is leading and therefore may not pass. */
  mustPlay: boolean;
  onPlay: () => void;
  onPass: () => void;
  onClear: () => void;
}

/**
 * Play, pass and clear controls. Mirrors the server's rules locally so the
 * buttons reflect legality immediately, but the server still decides.
 */
export function ActionBar({
  isYourTurn,
  blockedReason,
  selectionCount,
  mustPlay,
  onPlay,
  onPass,
  onClear,
}: ActionBarProps) {
  const status = !isYourTurn
    ? 'Waiting for the other players…'
    : selectionCount === 0
      ? 'Select cards to play.'
      : (blockedReason ?? 'Ready to play.');

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p
        aria-live="polite"
        className={`text-sm ${blockedReason && isYourTurn && selectionCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}
      >
        {status}
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClear} disabled={selectionCount === 0}>
          Clear
        </Button>
        <Button
          colorPalette="gray"
          variant="outline"
          onClick={onPass}
          disabled={!isYourTurn || mustPlay}
          title={mustPlay ? 'You are leading and must play' : undefined}
        >
          Pass
        </Button>
        <Button colorPalette="green" onClick={onPlay} disabled={!isYourTurn || blockedReason !== null}>
          Play {selectionCount > 0 ? `(${selectionCount})` : ''}
        </Button>
      </div>
    </div>
  );
}
