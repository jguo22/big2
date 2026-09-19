import { beats, Card, detectCombination, RoomView } from '@bigtwo/rules';
import { Button, Flex, Stack, Text } from '@chakra-ui/react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActionBar } from '../components/ActionBar.js';
import { Hand } from '../components/Hand.js';
import { SeatList } from '../components/SeatList.js';
import { TableArea } from '../components/TableArea.js';
import { useGame } from '../state/GameProvider.js';
import { ResultOverlay } from './ResultOverlay.js';

export interface GameScreenProps {
  room: RoomView;
  /** Connection and error banner, rendered by App so every screen shares one. */
  banner: ReactNode;
}

/** The match view: seats, table, private hand and action controls. */
export function GameScreen({ room, banner }: GameScreenProps) {
  const { playerId, play, pass, leaveRoom } = useGame();
  const match = room.match!;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Any state change from the server (a play, a pass, a new round) invalidates
  // the selection, which may no longer be legal or even in hand.
  useEffect(() => {
    setSelectedIds([]);
  }, [match.history.length, match.roundIndex]);

  const you = room.players.find((player) => player.id === playerId);
  const isYourTurn = you !== undefined && you.seat === match.turnSeat && match.winnerId === null;
  const selectedCards = match.yourHand.filter((card) => selectedIds.includes(card.id));
  const blockedReason = useMemo(() => checkSelection(selectedCards, match), [selectedCards, match]);

  const toggle = (card: Card) =>
    setSelectedIds((current) =>
      current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id],
    );

  return (
    <Flex direction="column" minH="100dvh" className="felt-pattern">
      <Flex
        as="header"
        w="full"
        maxW="960px"
        mx="auto"
        px={{ base: '16px', md: '28px' }}
        py={{ base: '12px', md: '18px' }}
        align="center"
        justify="space-between"
        gap="12px"
      >
        <Text fontSize="13px" fontWeight="800" letterSpacing=".1em" color="fg.onFeltMuted">
          {room.code}
        </Text>
        <Button
          size="xs"
          variant="ghost"
          color="fg.onFelt"
          borderColor="rgba(255,255,255,.28)"
          _hover={{ bg: 'rgba(255,255,255,.14)' }}
          onClick={leaveRoom}
        >
          Leave
        </Button>
      </Flex>

      <Stack gap="14px" w="full" maxW="960px" mx="auto" px={{ base: '16px', md: '28px' }} flex="1">
        {banner}
        <SeatList room={room} youId={playerId} />
        <TableArea match={match} players={room.players} />
      </Stack>

      <Stack
        as="footer"
        gap="12px"
        w="full"
        maxW="960px"
        mx="auto"
        px={{ base: '10px', md: '28px' }}
        pb={{ base: '18px', md: '26px' }}
        pt="6px"
      >
        <Hand cards={match.yourHand} selectedIds={selectedIds} disabled={!isYourTurn} onToggle={toggle} />
        <ActionBar
          isYourTurn={isYourTurn}
          blockedReason={selectedIds.length === 0 ? 'Select cards to play.' : blockedReason}
          selectionCount={selectedIds.length}
          mustPlay={match.currentPlay === null}
          onPlay={() => play(selectedIds)}
          onPass={pass}
          onClear={() => setSelectedIds([])}
        />
      </Stack>

      {match.winnerId && <ResultOverlay room={room} winnerId={match.winnerId} />}
    </Flex>
  );
}

/**
 * Explains, for the local player, why the current selection cannot be played.
 * This mirrors the server's rules to keep the controls responsive; the server
 * re-checks everything and has the final say.
 *
 * Params:
 *   selected: the cards the player has selected.
 *   match: the player's view of the match.
 * Returns: a human-readable reason, or `null` when the selection is playable.
 */
function checkSelection(selected: readonly Card[], match: RoomView['match']): string | null {
  if (!match || selected.length === 0) return 'Select cards to play.';

  const combination = detectCombination(selected);
  if (!combination) return 'That is not a legal combination.';

  const isOpeningPlay = match.history.length === 0;
  if (isOpeningPlay && match.startingCardId && !selected.some((card) => card.id === match.startingCardId)) {
    const suit = match.startingCardId.endsWith('D') ? 'Diamonds' : 'Clubs';
    return `Your opening play must include the 3 of ${suit}.`;
  }

  if (match.currentPlay) {
    const current = detectCombination(match.currentPlay.cards);
    if (!current) return null;
    if (combination.size !== current.size) return `You must play exactly ${current.size} card(s).`;
    if (!beats(combination, current)) return 'That does not beat the current play.';
  }
  return null;
}
