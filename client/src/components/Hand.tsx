import { Card } from '@bigtwo/rules';
import { PlayingCard } from './PlayingCard.js';

export interface HandProps {
  cards: readonly Card[];
  selectedIds: readonly string[];
  /** Blocks selection, e.g. while it is another player's turn. */
  disabled?: boolean;
  onToggle: (card: Card) => void;
}

/**
 * The player's private hand. Cards overlap on narrow viewports and spread out
 * as space allows; each card is an individually focusable toggle.
 */
export function Hand({ cards, selectedIds, disabled, onToggle }: HandProps) {
  if (cards.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No cards left.</p>;
  }
  return (
    <div
      role="group"
      aria-label="Your hand"
      className="flex flex-wrap justify-center gap-y-5 px-2 pb-2 pt-5 -space-x-4 sm:-space-x-2 md:space-x-1"
    >
      {cards.map((card) => (
        <PlayingCard
          key={card.id}
          card={card}
          selected={selectedIds.includes(card.id)}
          disabled={disabled}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
