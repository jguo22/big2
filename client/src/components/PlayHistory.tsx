import { ComboCategory, PlayRecord, PublicPlayer, RANK_LABEL, SUIT_GLYPH } from '@bigtwo/rules';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

export interface PlayHistoryProps {
  /** Every play of the match, oldest first. */
  plays: readonly PlayRecord[];
  /** Used to name the player behind each play. */
  players: readonly PublicPlayer[];
  onClose: () => void;
}

const CATEGORY_LABEL: Record<ComboCategory, string> = {
  single: 'single',
  pair: 'pair',
  triple: 'triple',
  straight: 'straight',
  flush: 'flush',
  fullHouse: 'full house',
  fourOfAKind: 'four of a kind',
  straightFlush: 'straight flush',
};

/**
 * A scrolling log of every play in the match, oldest first, split by round.
 * A round ends when everyone passes, so each round heading marks the point
 * where the last player to play won a free lead.
 *
 * Params:
 *   plays: the match history, oldest first.
 *   players: the room's players, for resolving names.
 *   onClose: called when the player dismisses the panel.
 */
export function PlayHistory({ plays, players, onClose }: PlayHistoryProps) {
  const bottom = useRef<HTMLDivElement>(null);
  const nameOf = (playerId: string) => players.find((player) => player.id === playerId)?.name ?? 'Unknown';

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [plays.length]);

  return (
    <Flex
      as="aside"
      aria-label="Play history"
      direction="column"
      position="absolute"
      top="0"
      right="0"
      bottom="0"
      w={{ base: '82vw', md: '340px' }}
      bg="rgba(11, 38, 35, .96)"
      borderLeftWidth="1px"
      borderColor="whiteAlpha.200"
      color="white"
      pointerEvents="auto"
    >
      <Flex align="center" justify="space-between" px="16px" py="12px" borderBottomWidth="1px" borderColor="whiteAlpha.200">
        <Text fontSize="12px" fontWeight="800" letterSpacing=".1em">
          PLAY HISTORY
        </Text>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          fontSize="12px"
          color="white"
          borderColor="whiteAlpha.300"
          _hover={{ bg: 'whiteAlpha.200' }}
        >
          Close
        </Button>
      </Flex>

      <Box flex="1" overflowY="auto" px="16px" py="12px">
        {plays.length === 0 ? (
          <Text fontSize="13px" color="whiteAlpha.600">
            No plays yet.
          </Text>
        ) : (
          plays.map((play, index) => (
            <Box key={`${play.roundIndex}-${index}`}>
              {(index === 0 || play.roundIndex !== plays[index - 1].roundIndex) && (
                <RoundHeading
                  roundIndex={play.roundIndex}
                  leaderName={nameOf(play.playerId)}
                  isFirst={index === 0}
                />
              )}
              <Flex align="baseline" justify="space-between" gap="10px" py="5px">
                <Text fontSize="13px" fontWeight="700" flexShrink={0}>
                  {nameOf(play.playerId)}
                </Text>
                <Flex align="baseline" gap="6px" minW="0">
                  <Text fontSize="11px" color="whiteAlpha.600" textTransform="lowercase">
                    {CATEGORY_LABEL[play.category]}
                  </Text>
                  <Text fontSize="14px" fontWeight="700" whiteSpace="nowrap">
                    {play.cards.map((card) => (
                      <Box
                        key={card.id}
                        as="span"
                        ml="4px"
                        color={card.suit === 'H' || card.suit === 'D' ? 'coral' : 'white'}
                      >
                        {RANK_LABEL[card.rank]}
                        {SUIT_GLYPH[card.suit]}
                      </Box>
                    ))}
                  </Text>
                </Flex>
              </Flex>
            </Box>
          ))
        )}
        <Box ref={bottom} />
      </Box>
    </Flex>
  );
}

function RoundHeading({
  roundIndex,
  leaderName,
  isFirst,
}: {
  roundIndex: number;
  leaderName: string;
  isFirst: boolean;
}) {
  return (
    <Box mt={isFirst ? '0' : '18px'} pt={isFirst ? '0' : '14px'} borderTopWidth={isFirst ? '0' : '1px'} borderColor="whiteAlpha.200">
      <Text fontFamily="heading" fontSize="22px" lineHeight="1.1">
        Round {roundIndex + 1}
      </Text>
      <Text fontSize="11px" color="whiteAlpha.600" mb="4px">
        {isFirst ? `${leaderName} opens` : `Everyone passed · ${leaderName} leads`}
      </Text>
    </Box>
  );
}
