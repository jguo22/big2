import { beats, Card, detectCombination, PublicPlayer, RoomView } from '@bigtwo/rules';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { ActionBar } from '../components/ActionBar.js';
import { Hand } from '../components/Hand.js';
import { OpponentSeat, SeatPosition } from '../components/OpponentSeat.js';
import { PlayHistory } from '../components/PlayHistory.js';
import { TableArea } from '../components/TableArea.js';
import { useGame } from '../state/GameProvider.js';
import { ResultOverlay } from './ResultOverlay.js';

export interface GameScreenProps {
  room: RoomView;
}

/**
 * Where opponents sit for a given opponent count, listed in turn order
 * starting with the player who acts after you.
 */
const SEAT_LAYOUT: Record<number, SeatPosition[]> = {
  1: ['top'],
  2: ['left', 'right'],
  3: ['left', 'top', 'right'],
};

const GAME_LAYERS = {
  hand: 0,
  table: 1,
  seats: 2,
  actions: 3,
  chrome: 5,
  history: 6,
} as const;

/** The match view: a felt table with the opponents seated around it. */
export function GameScreen({ room }: GameScreenProps) {
  const { playerId, play, pass, leaveRoom } = useGame();
  const match = room.match!;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  // Any state change from the server (a play, a pass, a new round) invalidates
  // the selection, which may no longer be legal or even in hand.
  useEffect(() => {
    setSelectedIds([]);
  }, [match.history.length, match.roundIndex]);

  // A new match brings the overlay back the next time someone wins.
  useEffect(() => {
    setResultDismissed(false);
  }, [match.winnerId]);

  const you = room.players.find((player) => player.id === playerId);
  const isYourTurn = you !== undefined && you.seat === match.turnSeat && match.winnerId === null;
  const selectedCards = match.yourHand.filter((card) => selectedIds.includes(card.id));
  const blockedReason = useMemo(() => checkSelection(selectedCards, match), [selectedCards, match]);

  const opponents = useMemo(() => seatOpponents(room.players, you?.seat ?? 0), [room.players, you?.seat]);
  const layout = SEAT_LAYOUT[opponents.length] ?? [];

  const toggle = (card: Card) =>
    setSelectedIds((current) =>
      current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id],
    );

  return (
    <Box minH="100dvh" position="relative" className="felt-pattern">
      <Flex
        position="absolute"
        top={{ base: '14px', md: '24px' }}
        left={{ base: '18px', md: '32px' }}
        right={{ base: '18px', md: '32px' }}
        zIndex={GAME_LAYERS.chrome}
        align="center"
        justify="space-between"
        gap="12px"
      >
        <Text fontSize="18px" fontWeight="800" letterSpacing=".1em" color="whiteAlpha.700">
          {room.code}
        </Text>
        <Flex align="center" gap="8px">
          {match.winnerId && resultDismissed && (
            <Button
              onClick={() => setResultDismissed(false)}
              variant="ghost"
              size="sm"
              fontSize="12px"
              color="white"
              borderColor="whiteAlpha.300"
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              Result
            </Button>
          )}
          <Button
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            variant="ghost"
            size="sm"
            fontSize="12px"
            color="white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            History
          </Button>
          <Button
            onClick={leaveRoom}
            variant="ghost"
            size="sm"
            fontSize="12px"
            color="white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Exit
          </Button>
        </Flex>
      </Flex>

      <Box w="100%" h="100dvh" minH="560px" position="relative" overflow="hidden">
        {opponents.map((player, index) => (
          <OpponentSeat
            key={player.id}
            player={player}
            position={layout[index] ?? 'top'}
            isTurn={player.seat === match.turnSeat && match.winnerId === null}
            hasPassed={match.visiblePassedSeats.includes(player.seat)}
          />
        ))}

        <Flex
          position="absolute"
          inset="18% 10% 31%"
          zIndex={GAME_LAYERS.table}
          align="center"
          justify="center"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="24px"
        >
          <TableArea
            match={match}
            passedSeats={match.visiblePassedSeats}
            playerPositions={new Map([
              ...(you ? [[you.id, 'bottom' as const] as const] : []),
              ...opponents.map((player, index) => [player.id, layout[index] ?? 'top'] as const),
            ])}
            seatPositions={new Map([
              ...(you ? [[you.seat, 'bottom' as const] as const] : []),
              ...opponents.map((player, index) => [player.seat, layout[index] ?? 'top'] as const),
            ])}
            isYourTurn={isYourTurn}
          />
        </Flex>

        <Box
          position="absolute"
          bottom="8%"
          left="50%"
          transform="translateX(-50%)"
          w="74vw"
          zIndex={GAME_LAYERS.hand}
        >
          <Hand
            cards={match.yourHand}
            selectedIds={selectedIds}
            disabled={!isYourTurn}
            onToggle={toggle}
            onSelect={setSelectedIds}
          />
        </Box>

        <Text
          position="absolute"
          bottom="1.5%"
          left="50%"
          transform="translateX(-50%)"
          zIndex={GAME_LAYERS.hand}
          color="white"
          fontWeight="800"
          fontSize="13px"
          whiteSpace="nowrap"
        >
          {you?.name ?? 'You'} · {match.yourHand.length} card{match.yourHand.length === 1 ? '' : 's'}
        </Text>

        <Box
          position="absolute"
          top="57%"
          left="50%"
          transform="translateX(-50%)"
          zIndex={GAME_LAYERS.actions}
        >
          <ActionBar
            playerName={you?.name ?? 'You'}
            handCount={match.yourHand.length}
            showPlayerName={false}
            isYourTurn={isYourTurn}
            blockedReason={selectedIds.length === 0 ? 'Select cards to play.' : blockedReason}
            selectionCount={selectedIds.length}
            mustPlay={match.currentPlay === null}
            onPlay={() => play(selectedIds)}
            onPass={pass}
          />
        </Box>

        {/* Centred on the table so the winner stays on screen while the
            finished hand is reviewed; clicks pass through to the table. */}
        {match.winnerId && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex={GAME_LAYERS.chrome}
            pointerEvents="none"
          >
            <Flex
              className="winner-plaque"
              direction="column"
              align="center"
              bg="bg.canvas"
              borderWidth="1px"
              borderColor="coral"
              borderRadius="card"
              boxShadow="lifted"
              outline="1px solid"
              outlineColor="rgba(232, 110, 75, .35)"
              outlineOffset="6px"
              px={{ base: '30px', md: '48px' }}
              py={{ base: '18px', md: '24px' }}
            >
              <Text fontSize="10px" fontWeight="800" letterSpacing=".3em" color="brand.fg">
                WINNER
              </Text>
              <Text
                fontFamily="heading"
                fontSize={{ base: '32px', md: '44px' }}
                lineHeight="1.15"
                whiteSpace="nowrap"
              >
                {match.winnerId === playerId
                  ? 'You win'
                  : `${room.players.find((player) => player.id === match.winnerId)?.name ?? 'Someone'} wins`}
              </Text>
              <Text mt="4px" fontSize="11px" letterSpacing=".45em" color="fg.subtle">
                ♠♥♦♣
              </Text>
            </Flex>
          </Box>
        )}
      </Box>

      {/* Full-bleed so the panel anchors to the window edge; clicks pass
          through everywhere except the panel itself. */}
      {historyOpen && (
        <Box position="absolute" inset="0" zIndex={GAME_LAYERS.history} pointerEvents="none">
          <PlayHistory
            plays={match.history}
            players={room.players}
            onClose={() => setHistoryOpen(false)}
          />
        </Box>
      )}

      {match.winnerId && !resultDismissed && (
        <ResultOverlay room={room} winnerId={match.winnerId} onDismiss={() => setResultDismissed(true)} />
      )}
    </Box>
  );
}

/**
 * Orders the other players by turn order, starting with whoever plays after
 * the local player, so seat positions stay stable as the turn moves.
 *
 * Params:
 *   players: every player in the room.
 *   yourSeat: the local player's seat index.
 * Returns: the opponents, in the order they will act.
 */
function seatOpponents(players: readonly PublicPlayer[], yourSeat: number): PublicPlayer[] {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const start = ordered.findIndex((player) => player.seat === yourSeat);
  const rotated = start === -1 ? ordered : [...ordered.slice(start), ...ordered.slice(0, start)];
  return rotated.filter((player) => player.seat !== yourSeat);
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
  if (!combination) return 'This is not a legal combination.';

  const isOpeningPlay = match.history.length === 0;
  if (isOpeningPlay && match.startingCardId && !selected.some((card) => card.id === match.startingCardId)) {
    const suit = match.startingCardId.endsWith('D') ? 'Diamonds' : 'Clubs';
    return `Your opening play must include the 3 of ${suit}.`;
  }

  if (match.currentPlay) {
    const current = detectCombination(match.currentPlay.cards);
    if (!current) return null;
    if (combination.size !== current.size) return `You must play exactly ${current.size} card(s).`;
    if (!beats(combination, current)) return 'This does not beat the current play.';
  }
  return null;
}
