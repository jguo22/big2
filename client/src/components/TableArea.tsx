import { PlayRecord, PublicMatchState } from '@bigtwo/rules';
import { Box, Flex, Text } from '@chakra-ui/react';
import { PlayingCard } from './PlayingCard.js';

export type PlayPosition = 'top' | 'left' | 'right' | 'bottom';

export interface TableAreaProps {
  match: PublicMatchState;
  passedSeats: readonly number[];
  playerPositions: ReadonlyMap<string, PlayPosition>;
  seatPositions: ReadonlyMap<number, PlayPosition>;
  /** True when the local player is the one to act. */
  isYourTurn: boolean;
}

/**
 * Each seat's action stays visible until that player's next turn starts.
 */
export function TableArea({ match, passedSeats, playerPositions, seatPositions, isYourTurn }: TableAreaProps) {
  const recent = match.visiblePlays;

  return (
    <Box
      as="section"
      aria-label="Table"
      aria-live="polite"
      position="relative"
      w="full"
      h="full"
      minH={{ base: '112px', md: '148px' }}
    >
      <Box position="absolute" inset="0">
        {recent.map((play, index) => (
          <StackedPlay
            key={`${play.playerId}-${play.roundIndex}-${index}`}
            play={play}
            position={playerPositions.get(play.playerId) ?? 'top'}
            isCurrent={play.seat === match.currentPlay?.seat}
            depth={index}
          />
        ))}
        {passedSeats.map((seat) => (
          <PassMarker key={seat} position={seatPositions.get(seat) ?? 'top'} />
        ))}
      </Box>
      {!match.currentPlay && (
        <Text position="absolute" inset="0" display="flex" alignItems="center" justifyContent="center" color="whiteAlpha.500" fontSize="13px" textAlign="center">
          {isYourTurn ? 'Choose cards from your hand to lead' : 'Waiting for the next play'}
        </Text>
      )}
    </Box>
  );
}

function PassMarker({ position }: { position: PlayPosition }) {
  const anchor = {
    top: { top: '8px', left: '50%', transform: 'translateX(-50%)' },
    left: { top: '50%', left: '8px', transform: 'translateY(-50%)' },
    right: { top: '50%', right: '8px', transform: 'translateY(-50%)' },
    bottom: { bottom: '8px', left: '50%', transform: 'translateX(-50%)' },
  }[position];

  return (
    <Box
      position="absolute"
      {...anchor}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: '12px', md: '18px' }}
      py={{ base: '8px', md: '10px' }}
      bg="#2563eb"
      zIndex={4}
      borderRadius="3px"
      color="white"
      fontSize="clamp(9px, 1.3vw, 16px)"
      fontWeight="800"
      letterSpacing=".08em"
    >
      PASS
    </Box>
  );
}

interface StackedPlayProps {
  play: PlayRecord;
  position: PlayPosition;
  isCurrent: boolean;
  depth: number;
}

function StackedPlay({ play, position, isCurrent, depth }: StackedPlayProps) {
  const anchor = {
    top: { top: '8px', left: '50%', transform: 'translateX(-50%)' },
    left: { top: '50%', left: '8px', transform: 'translateY(-50%)' },
    right: { top: '50%', right: '8px', transform: 'translateY(-50%)' },
    bottom: { bottom: '8px', left: '50%', transform: 'translateX(-50%)' },
  }[position];

  return (
    <Box
      position="absolute"
      {...anchor}
      zIndex={depth}
      transform={`${anchor.transform} translateY(${isCurrent ? '0' : '12px'}) scale(${isCurrent ? 1 : 0.82})`}
      transformOrigin="bottom center"
      opacity={isCurrent ? 1 : 0.48}
      transition="transform .2s, opacity .2s"
    >
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
