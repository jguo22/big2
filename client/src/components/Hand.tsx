import { Card } from '@bigtwo/rules';
import { Box, Flex, Text } from '@chakra-ui/react';
import { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, useRef, useState } from 'react';
import { PlayingCard } from './PlayingCard.js';

export interface HandProps {
  cards: readonly Card[];
  selectedIds: readonly string[];
  /** Blocks selection, e.g. while it is another player's turn. */
  disabled?: boolean;
  onToggle: (card: Card) => void;
  /**
   * Replaces the whole selection while the player drags a rectangle over the
   * hand. Called with the ids selected when the drag began plus every card the
   * rectangle currently covers; not called for plain clicks, which go to
   * `onToggle` instead.
   */
  onSelect: (cardIds: string[]) => void;
}

/** A rectangle, in the coordinate space named at the use site. */
interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Pointer travel, in px, before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 4;

/**
 * The player's private hand: a fanned row of cards that overlap so a full
 * thirteen fit across a phone. Each card is an individually focusable toggle,
 * and dragging across the hand rubber-band selects every card it touches.
 */
export function Hand({ cards, selectedIds, disabled, onToggle, onSelect }: HandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const base = useRef<readonly string[]>([]);
  const dragged = useRef(false);
  const [marquee, setMarquee] = useState<Rect | null>(null);

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

  /** Pointer position clamped into the hand, in container coordinates. */
  const localPoint = (event: ReactPointerEvent, bounds: DOMRect) => ({
    x: Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width),
    y: Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height),
  });

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (disabled || event.button !== 0 || !container) return;
    origin.current = localPoint(event, container.getBoundingClientRect());
    base.current = selectedIds;
    dragged.current = false;
    container.setPointerCapture(event.pointerId);
  };

  const extendDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const start = origin.current;
    if (!container || !start) return;

    const bounds = container.getBoundingClientRect();
    const point = localPoint(event, bounds);
    if (!dragged.current && Math.hypot(point.x - start.x, point.y - start.y) < DRAG_THRESHOLD) return;
    dragged.current = true;

    const rect: Rect = {
      left: Math.min(start.x, point.x),
      top: Math.min(start.y, point.y),
      right: Math.max(start.x, point.x),
      bottom: Math.max(start.y, point.y),
    };
    setMarquee(rect);
    onSelect(
      idsInRect(
        container,
        {
          left: rect.left + bounds.left,
          top: rect.top + bounds.top,
          right: rect.right + bounds.left,
          bottom: rect.bottom + bounds.top,
        },
        base.current,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (origin.current) containerRef.current?.releasePointerCapture(event.pointerId);
    origin.current = null;
    setMarquee(null);
  };

  // A drag that ends over a card would otherwise fire that card's click and
  // toggle it straight back off.
  const swallowClickAfterDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return;
    dragged.current = false;
    event.stopPropagation();
  };

  return (
    <Flex
      ref={containerRef}
      role="group"
      aria-label="Your hand"
      justify="center"
      align="flex-end"
      w="full"
      position="relative"
      touchAction="none"
      userSelect="none"
      onPointerDown={startDrag}
      onPointerMove={extendDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={swallowClickAfterDrag}
    >
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
        >
          {group.map((card, cardIndex) => (
            <Box
              key={card.id}
              data-card-id={card.id}
              position="relative"
              zIndex={cardIndex}
              w="full"
              aspectRatio="5 / 7"
              mt={cardIndex === 0 ? '0' : { base: '-24px', md: '-44px' }}
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

      {marquee && (
        <Box
          position="absolute"
          left={`${marquee.left}px`}
          top={`${marquee.top}px`}
          w={`${marquee.right - marquee.left}px`}
          h={`${marquee.bottom - marquee.top}px`}
          zIndex="20"
          pointerEvents="none"
          borderWidth="1px"
          borderColor="coral"
          borderRadius="2px"
          bg="rgba(255, 255, 255, .18)"
        />
      )}
    </Flex>
  );
}

/**
 * The card ids a marquee selects.
 *
 * Params:
 *   container: the hand element; its `[data-card-id]` descendants are the cards.
 *   rect: the marquee, in viewport coordinates.
 *   base: ids already selected when the drag began; these stay selected.
 * Returns: `base`, in its original order, followed by the newly covered cards
 *   in hand order. A card counts as covered when its box overlaps `rect` at all.
 */
function idsInRect(container: HTMLElement, rect: Rect, base: readonly string[]): string[] {
  const covered = Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]'))
    .filter((element) => {
      const box = element.getBoundingClientRect();
      return box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top;
    })
    .map((element) => element.dataset.cardId!)
    .filter((id) => !base.includes(id));
  return [...base, ...covered];
}
