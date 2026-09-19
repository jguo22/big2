import { Button, Flex, Text } from '@chakra-ui/react';

export interface ActionBarProps {
  /** Whether it is the local player's turn. */
  isYourTurn: boolean;
  /** Why the current selection cannot be played, or `null` when it can. */
  blockedReason: string | null;
  selectionCount: number;
  /** True when the local player is leading and therefore may not pass. */
  mustPlay: boolean;
  onPlay: () => void;
  onPass: () => void;
  onClear: () => void;
}

/**
 * Play, pass and clear controls. Mirrors the server's rules locally so the
 * buttons reflect legality immediately, but the server still decides.
 */
export function ActionBar({
  isYourTurn,
  blockedReason,
  selectionCount,
  mustPlay,
  onPlay,
  onPass,
  onClear,
}: ActionBarProps) {
  const blocked = Boolean(blockedReason) && isYourTurn && selectionCount > 0;
  const status = !isYourTurn
    ? 'Waiting for the other players…'
    : selectionCount === 0
      ? 'Select cards to play.'
      : (blockedReason ?? 'Ready to play.');

  return (
    <Flex direction={{ base: 'column', sm: 'row' }} align="center" justify="space-between" gap="10px" w="full">
      <Text aria-live="polite" fontSize="13px" fontWeight="600" color={blocked ? 'coral' : 'fg.onFeltMuted'}>
        {status}
      </Text>

      <Flex gap="8px">
        <Button
          variant="ghost"
          size="sm"
          color="fg.onFeltMuted"
          borderColor="rgba(255,255,255,.22)"
          _hover={{ bg: 'rgba(255,255,255,.12)', color: 'fg.onFelt' }}
          onClick={onClear}
          disabled={selectionCount === 0}
        >
          Clear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          px="22px"
          color="fg.onFelt"
          borderColor="rgba(255,255,255,.35)"
          _hover={{ bg: 'rgba(255,255,255,.14)' }}
          onClick={onPass}
          disabled={!isYourTurn || mustPlay}
          title={mustPlay ? 'You are leading and must play' : undefined}
        >
          Pass
        </Button>
        <Button
          colorPalette="brand"
          size="sm"
          px="26px"
          onClick={onPlay}
          disabled={!isYourTurn || blockedReason !== null}
        >
          Play {selectionCount > 0 ? `(${selectionCount})` : ''}
        </Button>
      </Flex>
    </Flex>
  );
}
