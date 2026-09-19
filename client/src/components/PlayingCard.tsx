import { Card, RANK_LABEL, SUIT_GLYPH } from '@bigtwo/rules';
import { Box, chakra, Text } from '@chakra-ui/react';

/** A real <button> with Chakra style props, so `type` and `disabled` type-check. */
const CardButton = chakra('button');

export type CardSize = 'sm' | 'md';

export interface PlayingCardProps {
  card: Card;
  /** Renders the selected (raised, outlined) state and sets `aria-pressed`. */
  selected?: boolean;
  /** Greys the card out and blocks interaction. */
  disabled?: boolean;
  /** Omit to render a static card rather than a button. */
  onToggle?: (card: Card) => void;
  size?: CardSize;
}

const SIZES: Record<CardSize, { w: string; rank: string; suit: string }> = {
  sm: { w: 'clamp(34px, 5vw, 46px)', rank: 'clamp(11px, 1.4vw, 14px)', suit: 'clamp(18px, 2.4vw, 24px)' },
  md: { w: 'clamp(42px, 6.2vw, 68px)', rank: 'clamp(13px, 1.7vw, 20px)', suit: 'clamp(22px, 3vw, 38px)' },
};

const SUIT_NAMES: Record<Card['suit'], string> = {
  S: 'Spades',
  H: 'Hearts',
  C: 'Clubs',
  D: 'Diamonds',
};

/**
 * One card face. Renders as a toggle button when `onToggle` is supplied and as
 * plain content otherwise, so table cards are not focusable.
 */
export function PlayingCard({ card, selected, disabled, onToggle, size = 'md' }: PlayingCardProps) {
  const isRed = card.suit === 'H' || card.suit === 'D';
  const metrics = SIZES[size];
  const label = `${RANK_LABEL[card.rank]} of ${SUIT_NAMES[card.suit]}`;
  const ink = isRed ? 'coral' : 'ink';

  const face = (
    <>
      <Text position="absolute" top="5%" left="9%" fontFamily="heading" fontSize={metrics.rank} lineHeight=".9" color={ink}>
        {RANK_LABEL[card.rank]}
      </Text>
      <Text
        position="absolute"
        inset="0"
        display="flex"
        alignItems="center"
        justifyContent="center"
        pt="12%"
        fontSize={metrics.suit}
        lineHeight="1"
        color={ink}
        aria-hidden
      >
        {SUIT_GLYPH[card.suit]}
      </Text>
    </>
  );

  const surface = {
    w: metrics.w,
    aspectRatio: '2 / 3',
    bg: '#fffdf6',
    borderWidth: '1px',
    borderRadius: '7px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    flex: '0 0 auto',
  };

  if (!onToggle) {
    return (
      <Box {...surface} borderColor="border.subtle" boxShadow="0 4px 10px rgba(7,39,36,.18)" role="img" aria-label={label}>
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
      borderColor={selected ? 'coral' : 'border.subtle'}
      boxShadow={selected ? '0 10px 20px rgba(7,39,36,.28)' : '0 4px 10px rgba(7,39,36,.18)'}
      opacity={disabled ? 0.45 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      transform={selected ? 'translateY(-16px)' : 'translateY(0)'}
      transition="transform .16s ease-out, box-shadow .16s ease-out"
      _hover={disabled ? undefined : { transform: selected ? 'translateY(-16px)' : 'translateY(-7px)' }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'coral', outlineOffset: '2px' }}
    >
      {face}
    </CardButton>
  );
}
