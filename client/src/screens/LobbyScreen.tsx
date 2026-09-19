import { MAX_PLAYERS, MIN_PLAYERS, RoomView } from '@bigtwo/rules';
import { Badge, Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
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
    <Box minH="100dvh" bg="bg.canvas" px={{ base: '20px', md: '48px' }} py={{ base: '22px', md: '40px' }}>
      <Stack gap={{ base: '24px', md: '32px' }} maxW="1100px" mx="auto">
        <Flex align="center" gap="12px">
          <Button
            variant="ghost"
            colorPalette="forest"
            onClick={leaveRoom}
            aria-label="Leave room"
            fontSize="26px"
            h="48px"
            minW="48px"
            px="0"
          >
            ←
          </Button>
        </Flex>

        <Flex align="flex-end" justify="space-between" gap="16px" wrap="wrap">
          <Stack gap="10px" minW="0">
            <Heading fontFamily="heading" fontWeight="400" fontSize={{ base: '48px', md: '72px' }} lineHeight=".92">
              {room.name}
            </Heading>
            <Flex align="center" gap="10px" wrap="wrap">
              <Badge colorPalette={room.isPrivate ? 'brand' : 'forest'} variant={room.isPrivate ? 'solid' : 'subtle'}>
                {room.isPrivate ? 'Private' : 'Public'}
              </Badge>
              <Text fontSize="16px" fontWeight="700" color="fg.muted">
                Code {room.code}
              </Text>
            </Flex>
          </Stack>

          <Text fontSize="16px" color="fg.subtle" pb="10px">
            {room.players.length} of {MAX_PLAYERS} seated
          </Text>
        </Flex>

        <SeatList room={room} youId={playerId} onRemoveBot={isHost ? removeBot : undefined} />

        <Flex gap="12px" wrap="wrap" align="center" justify={isHost ? 'space-between' : 'flex-end'}>
          {isHost && (
            <Button
              colorPalette="forest"
              variant="outline"
              h="50px"
              px="26px"
              fontSize="16px"
              onClick={addBot}
              disabled={room.players.length >= MAX_PLAYERS}
            >
              + Add bot
            </Button>
          )}
          {isHost ? (
            <Button
              colorPalette="brand"
              h="48px"
              px="34px"
              onClick={startMatch}
              disabled={!enoughPlayers || !everyoneReady}
            >
              Start match
            </Button>
          ) : (
            <Button
              colorPalette={you?.ready ? 'forest' : 'brand'}
              variant={you?.ready ? 'outline' : 'solid'}
              h="48px"
              px="34px"
              onClick={() => setReady(!you?.ready)}
            >
              {you?.ready ? 'Not ready' : "I'm ready"}
            </Button>
          )}
        </Flex>

        <Text fontSize="16px" color="fg.subtle">
          {!enoughPlayers
            ? `Waiting for at least ${MIN_PLAYERS} players — share the code, or add a bot.`
            : isHost
              ? everyoneReady
                ? 'Everyone is ready.'
                : 'Waiting for the other players to be ready.'
              : 'Waiting for the host to start the match.'}
        </Text>
      </Stack>
    </Box>
  );
}
