import { Card } from '@bigtwo/rules';
import { Flex, Text } from '@chakra-ui/react';
import { PlayingCard } from './PlayingCard.js';

export interface HandProps {
  cards: readonly Card[];
  selectedIds: readonly string[];
  /** Blocks selection, e.g. while it is another player's turn. */
  disabled?: boolean;
  onToggle: (card: Card) => void;
}

/**
 * The player's private hand. Cards overlap so a full hand fits on a phone, and
 * each card is an individually focusable toggle.
 */
export function Hand({ cards, selectedIds, disabled, onToggle }: HandProps) {
  if (cards.length === 0) {
    return (
      <Text py="24px" textAlign="center" fontSize="14px" color="fg.onFeltMuted">
        No cards left.
      </Text>
    );
  }

  return (
    // pt leaves room for a selected card to lift without being clipped.
    <Flex role="group" aria-label="Your hand" justify="center" align="flex-end" w="full" pt="20px" px="6px">
      {cards.map((card, index) => (
        <Flex
          key={card.id}
          flex="0 0 auto"
          ml={index === 0 ? '0' : 'clamp(-20px, -1.6vw, -6px)'}
          zIndex={selectedIds.includes(card.id) ? 20 : index}
        >
          <PlayingCard
            card={card}
            selected={selectedIds.includes(card.id)}
            disabled={disabled}
            onToggle={onToggle}
          />
        </Flex>
      ))}
    </Flex>
  );
}
