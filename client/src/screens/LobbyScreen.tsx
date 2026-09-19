import { MAX_PLAYERS, MIN_PLAYERS, RoomView } from '@bigtwo/rules';
import { Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { SeatList } from '../components/SeatList.js';
import { useGame } from '../state/GameProvider.js';

export interface LobbyScreenProps {
  room: RoomView;
}

/** Pre-match room: share the code, add bots, mark ready, and let the host deal. */
export function LobbyScreen({ room }: LobbyScreenProps) {
  const { playerId, setReady, startMatch, leaveRoom, addBot, removeBot } = useGame();
  const you = room.players.find((player) => player.id === playerId);
  const isHost = room.hostId === playerId;
  const everyoneReady = room.players.every((player) => player.ready || player.id === room.hostId);
  const enoughPlayers = room.players.length >= MIN_PLAYERS;

  return (
    <Stack gap="24px">
      <Flex align="flex-start" justify="space-between" gap="12px">
        <Stack gap="2px">
          <Text fontSize="11px" fontWeight="800" letterSpacing=".14em" textTransform="uppercase" color="fg.muted">
            Room code
          </Text>
          <Heading fontFamily="heading" fontWeight="400" fontSize={{ base: '44px', md: '56px' }} lineHeight="1">
            {room.code}
          </Heading>
        </Stack>
        <Button colorPalette="forest" variant="ghost" size="sm" fontWeight="800" onClick={leaveRoom}>
          Leave
        </Button>
      </Flex>

      <SeatList room={room} youId={playerId} onRemoveBot={isHost ? removeBot : undefined} />

      <Flex gap="10px" wrap="wrap" justify={isHost ? 'space-between' : 'flex-end'} align="center">
        {isHost && (
          <Button
            colorPalette="forest"
            variant="outline"
            borderRadius="pill"
            fontWeight="800"
            onClick={addBot}
            disabled={room.players.length >= MAX_PLAYERS}
          >
            + Add bot
          </Button>
        )}
        {isHost ? (
          <Button
            colorPalette="brand"
            borderRadius="pill"
            px="28px"
            fontWeight="800"
            onClick={startMatch}
            disabled={!enoughPlayers || !everyoneReady}
          >
            Start match
          </Button>
        ) : (
          <Button
            colorPalette={you?.ready ? 'forest' : 'brand'}
            variant={you?.ready ? 'outline' : 'solid'}
            borderRadius="pill"
            px="28px"
            fontWeight="800"
            onClick={() => setReady(!you?.ready)}
          >
            {you?.ready ? 'Not ready' : "I'm ready"}
          </Button>
        )}
      </Flex>

      <Text fontSize="13px" color="fg.subtle">
        {!enoughPlayers
          ? `Waiting for at least ${MIN_PLAYERS} players — share the code, or add a bot.`
          : isHost
            ? everyoneReady
              ? 'Everyone is ready.'
              : 'Waiting for the other players to be ready.'
            : 'Waiting for the host to start the match.'}
      </Text>
    </Stack>
  );
}
