import { RoomView } from '@bigtwo/rules';
import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { useGame } from '../state/GameProvider.js';

export interface ResultOverlayProps {
  room: RoomView;
  winnerId: string;
  /** Called when the player dismisses the overlay to review the finished table. */
  onDismiss: () => void;
}

/**
 * Match-complete view: who won, and what to do next.
 *
 * Params:
 *   room: the room whose match just ended.
 *   winnerId: the id of the player who emptied their hand.
 *   onDismiss: called when the player closes the overlay; the caller is
 *     responsible for hiding it so the finished table can be reviewed.
 */
export function ResultOverlay({ room, winnerId, onDismiss }: ResultOverlayProps) {
  const { playerId, newMatch, leaveRoom } = useGame();
  const winner = room.players.find((player) => player.id === winnerId);
  const youWon = winnerId === playerId;

  return (
    <Flex
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-heading"
      position="fixed"
      inset="0"
      zIndex="50"
      align="center"
      justify="center"
      p="16px"
      bg="rgba(10, 34, 31, .6)"
      backdropFilter="blur(3px)"
    >
      <Box
        position="relative"
        w="full"
        maxW="380px"
        bg="bg.canvas"
        borderRadius="24px"
        boxShadow="lifted"
        p="32px"
        textAlign="center"
      >
        <Button
          onClick={onDismiss}
          aria-label="Close"
          position="absolute"
          top="10px"
          right="10px"
          variant="ghost"
          size="sm"
          fontSize="16px"
          color="fg.muted"
        >
          ✕
        </Button>
        <Heading id="result-heading" fontFamily="heading" fontWeight="400" fontSize="40px" lineHeight="1">
          {youWon ? 'You win' : `${winner?.name ?? 'Someone'} wins`}
        </Heading>
        <Text mt="8px" fontSize="14px" color="fg.muted">
          {youWon ? 'You played your last card first.' : 'They played their last card first.'}
        </Text>

        <Stack gap="10px" mt="26px">
          <Button colorPalette="brand" size="lg" h="50px" onClick={newMatch}>
            New game
          </Button>
          <Button colorPalette="forest" variant="ghost" onClick={leaveRoom}>
            Leave room
          </Button>
        </Stack>
      </Box>
    </Flex>
  );
}
