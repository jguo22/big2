import { Card } from '@bigtwo/rules';
import { Box, Flex, Text } from '@chakra-ui/react';
import { PlayingCard } from './PlayingCard.js';

export interface HandProps {
  cards: readonly Card[];
  selectedIds: readonly string[];
  /** Blocks selection, e.g. while it is another player's turn. */
  disabled?: boolean;
  onToggle: (card: Card) => void;
}

/**
 * The player's private hand: a fanned row of cards that overlap so a full
 * thirteen fit across a phone. Each card is an individually focusable toggle.
 */
export function Hand({ cards, selectedIds, disabled, onToggle }: HandProps) {
  if (cards.length === 0) {
    return (
      <Text py="24px" textAlign="center" fontSize="14px" color="whiteAlpha.600">
        No cards left.
      </Text>
    );
  }

  const rankGroups = cards.reduce<Card[][]>((groups, card) => {
    const group = groups.at(-1);
    if (group && group[0].rank === card.rank) {
      group.push(card);
    } else {
      groups.push([card]);
    }
    return groups;
  }, []);

  return (
    <Flex role="group" aria-label="Your hand" justify="center" align="flex-end" w="full">
      {rankGroups.map((group, groupIndex) => (
        <Box
          key={group[0].rank}
          position="relative"
          display="flex"
          flexDirection="column"
          justifyContent="flex-end"
          flex="0 0 auto"
          w="clamp(38px, 5.3vw, 72px)"
          ml={groupIndex === 0 ? '0' : { base: '-2px', md: '-4px' }}
          zIndex={groupIndex}
        >
          {group.map((card, cardIndex) => (
            <Box
              key={card.id}
              position="relative"
              zIndex={cardIndex}
              w="full"
              aspectRatio="5 / 7"
              mt={cardIndex === 0 ? '0' : '-105%'}
            >
              <PlayingCard
                card={card}
                selected={selectedIds.includes(card.id)}
                disabled={disabled}
                onToggle={onToggle}
              />
            </Box>
          ))}
        </Box>
      ))}
    </Flex>
  );
}
