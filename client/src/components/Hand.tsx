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

  return (
    <Flex role="group" aria-label="Your hand" justify="center" align="center" w="full">
      {cards.map((card, index) => (
        <Box
          key={card.id}
          flex="0 0 auto"
          w="clamp(38px, 5.3vw, 72px)"
          ml={index === 0 ? '0' : { base: '-2px', md: '-4px' }}
          zIndex={index}
        >
          <PlayingCard
            card={card}
            selected={selectedIds.includes(card.id)}
            disabled={disabled}
            onToggle={onToggle}
          />
        </Box>
      ))}
    </Flex>
  );
}
