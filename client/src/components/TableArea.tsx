import { PlayRecord, PublicMatchState, PublicPlayer } from '@bigtwo/rules';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { PlayingCard } from './PlayingCard.js';

export interface TableAreaProps {
  match: PublicMatchState;
  players: readonly PublicPlayer[];
  /** True when the local player is the one to act. */
  isYourTurn: boolean;
}

/** How many recent plays stay visible behind the current one. */
const VISIBLE_PLAYS = 3;

/**
 * The centre of the table. The current play sits at full size with the two
 * before it stacked behind, scaled down and faded, so the round reads as a
 * pile rather than a list.
 */
export function TableArea({ match, players, isYourTurn }: TableAreaProps) {
  const nameOf = (playerId: string) => players.find((p) => p.id === playerId)?.name ?? 'Someone';
  const recent = match.history.slice(-VISIBLE_PLAYS);
  const leadName = match.currentPlay ? nameOf(match.currentPlay.playerId) : null;

  return (
    <Stack
      as="section"
      aria-label="Table"
      aria-live="polite"
      gap="14px"
      w="full"
      px={{ base: '12px', md: '30px' }}
      align="center"
    >
      <Text
        color="whiteAlpha.700"
        fontSize="10px"
        fontWeight="800"
        letterSpacing=".16em"
        textTransform="uppercase"
      >
        {leadName ? `${leadName}'s play` : 'The table is ready'}
      </Text>

      {match.currentPlay ? (
        <Flex justify="center" align="flex-end" h={{ base: '112px', md: '148px' }} w="full">
          {recent.map((play, index) => (
            <StackedPlay
              key={`${play.playerId}-${play.roundIndex}-${index}`}
              play={play}
              name={nameOf(play.playerId)}
              isCurrent={index === recent.length - 1}
              isFirst={index === 0}
              depth={index}
            />
          ))}
        </Flex>
      ) : (
        <Text color="whiteAlpha.500" fontSize="13px" textAlign="center">
          {isYourTurn ? 'Choose cards from your hand to lead' : 'Waiting for the next play'}
        </Text>
      )}
    </Stack>
  );
}

interface StackedPlayProps {
  play: PlayRecord;
  name: string;
  isCurrent: boolean;
  isFirst: boolean;
  depth: number;
}

function StackedPlay({ play, name, isCurrent, isFirst, depth }: StackedPlayProps) {
  return (
    <Box
      position="relative"
      ml={isFirst ? '0' : { base: '-28px', md: '-42px' }}
      zIndex={depth}
      transform={`translateY(${isCurrent ? '0' : '12px'}) scale(${isCurrent ? 1 : 0.82})`}
      transformOrigin="bottom center"
      opacity={isCurrent ? 1 : 0.48}
      transition="transform .2s, opacity .2s"
    >
      <Text textAlign="center" color="whiteAlpha.700" fontSize="10px" mb="4px">
        {name}
      </Text>
      <Flex justify="center" h={{ base: '76px', md: '100px' }}>
        {play.cards.map((card, index) => (
          <Box key={card.id} ml={index === 0 ? '0' : { base: '-12px', md: '-17px' }} zIndex={index}>
            <PlayingCard card={card} variant="played" />
          </Box>
        ))}
      </Flex>
    </Box>
  );
}
