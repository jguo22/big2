import { ComboCategory, PublicMatchState, PublicPlayer } from '@bigtwo/rules';
import { PlayingCard } from './PlayingCard.js';

export interface TableAreaProps {
  match: PublicMatchState;
  players: readonly PublicPlayer[];
}

const CATEGORY_LABEL: Record<ComboCategory, string> = {
  single: 'Single',
  pair: 'Pair',
  triple: 'Triple',
  straight: 'Straight',
  flush: 'Flush',
  fullHouse: 'Full house',
  fourOfAKind: 'Four of a kind',
  straightFlush: 'Straight flush',
};

/**
 * The centre of the table: the play that must currently be beaten, plus the
 * recent plays of this round for context.
 */
export function TableArea({ match, players }: TableAreaProps) {
  const nameOf = (playerId: string) => players.find((p) => p.id === playerId)?.name ?? 'Someone';
  const recent = match.history.filter((play) => play.roundIndex === match.roundIndex).slice(-4, -1);

  return (
    <section
      aria-label="Table"
      aria-live="polite"
      className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4"
    >
      {match.currentPlay ? (
        <>
          <p className="text-sm text-slate-300">
            <span className="font-medium text-slate-100">{nameOf(match.currentPlay.playerId)}</span> played{' '}
            {CATEGORY_LABEL[match.currentPlay.category]}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {match.currentPlay.cards.map((card) => (
              <PlayingCard key={card.id} card={card} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Table is clear &mdash; the leading player may play any legal combination.
        </p>
      )}

      {recent.length > 0 && (
        <ol className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {recent.map((play, index) => (
            <li key={`${play.playerId}-${index}`}>
              {nameOf(play.playerId)}: {CATEGORY_LABEL[play.category]}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
