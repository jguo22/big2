import { PublicPlayer } from '@bigtwo/rules';
import { Box, Flex, Text } from '@chakra-ui/react';

/** Where a seat sits around the table. */
export type SeatPosition = 'top' | 'left' | 'right';

export interface OpponentSeatProps {
  player: PublicPlayer;
  position: SeatPosition;
  isTurn: boolean;
  hasPassed: boolean;
}

/** At most this many card backs are drawn, however large the hand is. */
const MAX_BACKS = 6;

const ANCHOR: Record<SeatPosition, Record<string, string>> = {
  top: { top: '18px', left: '50%', transform: 'translateX(-50%)' },
  left: { left: '18px', top: '50%', transform: 'translateY(-50%)' },
  right: { right: '18px', top: '50%', transform: 'translateY(-50%)' },
};

/** An opponent: a fan of face-down cards, their name, and how many they hold. */
export function OpponentSeat({ player, position, isTurn, hasPassed }: OpponentSeatProps) {
  const isTop = position === 'top';
  const rotation = isTop ? 180 : position === 'left' ? 90 : -90;
  const backs = Math.min(Math.max(player.handCount, 1), MAX_BACKS);

  return (
    <Box position="absolute" {...ANCHOR[position]} textAlign="center" color="white" zIndex="2">
      <Flex
        justify="center"
        position="relative"
        h={isTop ? '58px' : '136px'}
        w={isTop ? '120px' : '58px'}
        mb="7px"
        mx="auto"
        opacity={hasPassed ? 0.45 : 1}
        transition="opacity .2s"
      >
        {Array.from({ length: backs }).map((_, index) => (
          <Box
            key={index}
            position="absolute"
            left={isTop ? `${index * 10 + 18}px` : '11px'}
            top={isTop ? '0' : `${index * 10 + 18}px`}
            w="34px"
            h="52px"
            borderRadius="5px"
            bg="#c75d4c"
            borderWidth="1px"
            borderColor="blackAlpha.800"
            transform={`rotate(${rotation}deg)`}
            zIndex={index}
            backgroundImage="linear-gradient(135deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%)"
            backgroundSize="9px 9px"
          />
        ))}
      </Flex>

      <Flex align="center" justify="center" gap="6px">
        {isTurn && <Box w="7px" h="7px" borderRadius="full" bg="coral" />}
        <Text fontSize="12px" fontWeight="800" color={isTurn ? 'white' : 'whiteAlpha.800'}>
          {player.name}
        </Text>
      </Flex>
      <Text fontSize="10px" opacity=".6">
        {player.handCount} card{player.handCount === 1 ? '' : 's'}
      </Text>
    </Box>
  );
}
