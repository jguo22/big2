import { Card, RANK_LABEL, SUIT_GLYPH } from '@bigtwo/rules';

export type CardSize = 'sm' | 'md';

export interface PlayingCardProps {
  card: Card;
  /** Renders the selected (raised, outlined) state and sets `aria-pressed`. */
  selected?: boolean;
  /** Greys the card out and blocks interaction. */
  disabled?: boolean;
  /** Omit to render a static card rather than a button. */
  onToggle?: (card: Card) => void;
  size?: CardSize;
}

const SIZE_CLASSES: Record<CardSize, string> = {
  sm: 'h-16 w-11 text-sm sm:h-20 sm:w-14 sm:text-base',
  md: 'h-24 w-16 text-lg sm:h-28 sm:w-20 sm:text-xl',
};

/**
 * One card face. Renders as a toggle button when `onToggle` is supplied and as
 * plain content otherwise, so table cards are not focusable.
 */
export function PlayingCard({ card, selected, disabled, onToggle, size = 'md' }: PlayingCardProps) {
  const isRed = card.suit === 'H' || card.suit === 'D';
  const label = `${RANK_LABEL[card.rank]} of ${SUIT_NAMES[card.suit]}`;

  const face = (
    <>
      <span className="absolute left-1 top-0.5 leading-tight">{RANK_LABEL[card.rank]}</span>
      <span aria-hidden className="text-[1.6em] leading-none">
        {SUIT_GLYPH[card.suit]}
      </span>
      <span className="absolute bottom-0.5 right-1 rotate-180 leading-tight">{RANK_LABEL[card.rank]}</span>
    </>
  );

  const shell = [
    'relative flex select-none items-center justify-center rounded-lg border bg-white font-semibold shadow-sm',
    'border-slate-300 dark:border-slate-600 dark:bg-slate-100',
    SIZE_CLASSES[size],
    isRed ? 'text-rose-600' : 'text-slate-900',
  ].join(' ');

  if (!onToggle) {
    return (
      <div className={shell} role="img" aria-label={label}>
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected ?? false}
      disabled={disabled}
      onClick={() => onToggle(card)}
      className={[
        shell,
        'transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:-translate-y-1',
        selected ? '-translate-y-4 ring-2 ring-emerald-500' : '',
      ].join(' ')}
    >
      {face}
    </button>
  );
}

const SUIT_NAMES: Record<Card['suit'], string> = {
  S: 'Spades',
  H: 'Hearts',
  C: 'Clubs',
  D: 'Diamonds',
};
