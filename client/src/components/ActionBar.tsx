import { Button, Flex, Text } from '@chakra-ui/react';

export interface ActionBarProps {
  /** Shown above the buttons, with the local player's remaining card count. */
  playerName: string;
  /** Allows the name to be positioned separately from the table controls. */
  showPlayerName?: boolean;
  handCount: number;
  /** Whether it is the local player's turn. */
  isYourTurn: boolean;
  /** Why the current selection cannot be played, or `null` when it can. */
  blockedReason: string | null;
  selectionCount: number;
  /** True when the local player is leading and therefore may not pass. */
  mustPlay: boolean;
  onPlay: () => void;
  onPass: () => void;
}

/**
 * The bottom controls. Mirrors the server's rules locally so the buttons
 * reflect legality immediately, but the server still decides.
 */
export function ActionBar({
  playerName,
  showPlayerName = true,
  handCount,
  isYourTurn,
  blockedReason,
  selectionCount,
  mustPlay,
  onPlay,
  onPass,
}: ActionBarProps) {
  const blocked = Boolean(blockedReason) && isYourTurn && selectionCount > 0;

  return (
    <Flex direction="column" align="center" textAlign="center">
      {showPlayerName && (
        <Text color="white" fontWeight="800" fontSize="13px" mb="6px">
          {playerName} · {handCount} card{handCount === 1 ? '' : 's'}
        </Text>
      )}

      {blocked && (
        <Text aria-live="polite" color="coral" fontSize="11px" fontWeight="700" mb="6px">
          {blockedReason}
        </Text>
      )}

      <Flex justify="center" gap="8px">
        <Button
          onClick={onPlay}
          disabled={!isYourTurn || blockedReason !== null}
          h="40px"
          px="24px"
          fontSize="12px"
          bg="coral"
          color="white"
          borderColor="#d85e3d"
          _hover={{ bg: '#d85e3d' }}
        >
          Play {selectionCount > 0 && `(${selectionCount})`}
        </Button>
        <Button
          onClick={onPass}
          disabled={!isYourTurn || mustPlay}
          title={mustPlay ? 'You are leading and must play' : undefined}
          h="40px"
          px="22px"
          fontSize="12px"
          bg="whiteAlpha.200"
          color="white"
          borderColor="whiteAlpha.400"
          _hover={{ bg: 'whiteAlpha.300' }}
        >
          Pass
        </Button>
      </Flex>
    </Flex>
  );
}
