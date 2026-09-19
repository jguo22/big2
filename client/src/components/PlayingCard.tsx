import { Card, RANK_LABEL, SUIT_GLYPH } from '@bigtwo/rules';
import { Box, chakra, Flex, Text } from '@chakra-ui/react';

/** A real <button> with Chakra style props, so `type` and `disabled` type-check. */
const CardButton = chakra('button');

/** `hand` cards scale with the viewport; `played` cards sit at a fixed size on the table. */
export type CardVariant = 'hand' | 'played';

export interface PlayingCardProps {
  card: Card;
  /** Dims the card to show it is selected, and sets `aria-pressed`. */
  selected?: boolean;
  /** Blocks interaction, e.g. while it is another player's turn. */
  disabled?: boolean;
  /** Omit to render a static card rather than a button. */
  onToggle?: (card: Card) => void;
  variant?: CardVariant;
}

const SUIT_NAMES: Record<Card['suit'], string> = {
  S: 'Spades',
  H: 'Hearts',
  C: 'Clubs',
  D: 'Diamonds',
};

/** One card face, cream with the rank top-left and the suit filling the body. */
export function PlayingCard({ card, selected, disabled, onToggle, variant = 'hand' }: PlayingCardProps) {
  const isRed = card.suit === 'H' || card.suit === 'D';
  const ink = isRed ? 'coral' : 'ink';
  const played = variant === 'played';
  const label = `${RANK_LABEL[card.rank]} of ${SUIT_NAMES[card.suit]}`;

  const face = (
    <>
      <Flex
        position="absolute"
        top={played ? '4px' : '6%'}
        left={played ? '5px' : '8%'}
        alignItems="center"
        gap="2px"
        color={ink}
      >
        <Text
          fontFamily="heading"
          fontSize={played ? { base: '16px', md: '23px' } : 'clamp(12px, 1.65vw, 22px)'}
          lineHeight=".9"
        >
          {RANK_LABEL[card.rank]}
        </Text>
        <Text fontSize={played ? { base: '10px', md: '14px' } : 'clamp(8px, 1vw, 13px)'} lineHeight="1">
          {SUIT_GLYPH[card.suit]}
        </Text>
      </Flex>
      <Text
        position="absolute"
        inset="0"
        display="flex"
        alignItems="center"
        justifyContent="center"
        pt={played ? '12px' : '14%'}
        fontSize={played ? { base: '27px', md: '38px' } : 'clamp(20px, 3.2vw, 44px)'}
        lineHeight="1"
        color={ink}
        aria-hidden
      >
        {SUIT_GLYPH[card.suit]}
      </Text>
    </>
  );

  const surface = {
    w: played ? ({ base: '48px', md: '68px' } as const) : '100%',
    h: played ? undefined : '100%',
    aspectRatio: '5 / 7',
    bg: '#fffdf6',
    borderWidth: '1px',
    borderColor: 'blackAlpha.500',
    borderRadius: '3px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    flex: '0 0 auto',
  };

  if (!onToggle) {
    return (
      <Box {...surface} boxShadow={played ? '0 7px 13px rgba(0,0,0,.25)' : undefined} role="img" aria-label={label}>
        {face}
      </Box>
    );
  }

  return (
    <CardButton
      type="button"
      aria-label={label}
      aria-pressed={selected ?? false}
      disabled={disabled}
      onClick={() => onToggle(card)}
      {...surface}
      cursor={disabled ? 'default' : 'pointer'}
      _focusVisible={{ outline: '2px solid', outlineColor: 'coral', outlineOffset: '1px' }}
    >
      {face}
      {selected && (
        <Box position="absolute" inset="0" borderRadius="3px" bg="rgba(65, 84, 82, .55)" pointerEvents="none" />
      )}
    </CardButton>
  );
}
