import { ComboCategory, PublicMatchState, PublicPlayer } from '@bigtwo/rules';
import { Flex, Stack, Text } from '@chakra-ui/react';
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
 * earlier plays of this round for context.
 */
export function TableArea({ match, players }: TableAreaProps) {
  const nameOf = (playerId: string) => players.find((p) => p.id === playerId)?.name ?? 'Someone';
  const recent = match.history.filter((play) => play.roundIndex === match.roundIndex).slice(-4, -1);

  return (
    <Flex
      as="section"
      aria-label="Table"
      aria-live="polite"
      direction="column"
      align="center"
      justify="center"
      gap="12px"
      flex="1"
      minH={{ base: '150px', md: '200px' }}
      borderWidth="1px"
      borderColor="rgba(255,255,255,.18)"
      borderRadius="24px"
      bg="rgba(255,255,255,.04)"
      px="16px"
      py="20px"
    >
      {match.currentPlay ? (
        <>
          <Text fontSize="13px" color="fg.onFeltMuted">
            <Text as="span" fontWeight="800" color="fg.onFelt">
              {nameOf(match.currentPlay.playerId)}
            </Text>{' '}
            played {CATEGORY_LABEL[match.currentPlay.category].toLowerCase()}
          </Text>
          <Flex gap="6px" wrap="wrap" justify="center">
            {match.currentPlay.cards.map((card) => (
              <PlayingCard key={card.id} card={card} size="sm" />
            ))}
          </Flex>
        </>
      ) : (
        <Text fontSize="13px" color="fg.onFeltMuted" textAlign="center">
          Table is clear — lead any legal combination.
        </Text>
      )}

      {recent.length > 0 && (
        <Stack as="ol" direction="row" gap="12px" wrap="wrap" justify="center" listStyleType="none">
          {recent.map((play, index) => (
            <Text as="li" key={`${play.playerId}-${index}`} fontSize="11px" color="rgba(255,255,255,.4)">
              {nameOf(play.playerId)}: {CATEGORY_LABEL[play.category].toLowerCase()}
            </Text>
          ))}
        </Stack>
      )}
    </Flex>
  );
}
