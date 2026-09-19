import { PublicPlayer, RoomView } from '@bigtwo/rules';
import { Badge, Box, Flex, IconButton, SimpleGrid, Stack, Text } from '@chakra-ui/react';

export interface SeatListProps {
  room: RoomView;
  youId: string | null;
  /** Supplied only for the host in the lobby; shows a remove control on bot seats. */
  onRemoveBot?: (playerId: string) => void;
}

/**
 * The seats around the table: who is playing, how many cards they hold,
 * whether they are connected, and whose turn it is.
 */
export function SeatList({ room, youId, onRemoveBot }: SeatListProps) {
  const turnSeat = room.match?.turnSeat ?? null;
  const passedSeats = room.match?.passedSeats ?? [];

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap="10px" as="ul" listStyleType="none">
      {room.players.map((player) => (
        <Seat
          key={player.id}
          player={player}
          isYou={player.id === youId}
          isHost={player.id === room.hostId}
          isTurn={player.seat === turnSeat}
          hasPassed={passedSeats.includes(player.seat)}
          showHandCount={room.phase !== 'lobby'}
          onRemove={player.isBot ? onRemoveBot : undefined}
        />
      ))}
    </SimpleGrid>
  );
}

interface SeatProps {
  player: PublicPlayer;
  isYou: boolean;
  isHost: boolean;
  isTurn: boolean;
  hasPassed: boolean;
  showHandCount: boolean;
  onRemove?: (playerId: string) => void;
}

function Seat({ player, isYou, isHost, isTurn, hasPassed, showHandCount, onRemove }: SeatProps) {
  return (
    <Box
      as="li"
      aria-current={isTurn ? 'true' : undefined}
      bg={isTurn ? 'brand.muted' : 'bg.surface'}
      borderWidth="1px"
      borderColor={isTurn ? 'brand.solid' : 'border.subtle'}
      borderRadius="14px"
      p="12px"
      transition="background .2s, border-color .2s"
    >
      <Flex align="center" gap="8px">
        <Box
          w="8px"
          h="8px"
          flexShrink="0"
          borderRadius="full"
          bg={player.isBot ? 'fg.subtle' : player.connected ? '#5f9e70' : 'fg.subtle'}
        />
        <Text fontWeight="700" fontSize="14px" truncate>
          {player.name}
          {isYou ? ' (you)' : ''}
        </Text>
        {onRemove && (
          <IconButton
            aria-label={`Remove ${player.name}`}
            onClick={() => onRemove(player.id)}
            variant="ghost"
            colorPalette="forest"
            size="xs"
            ml="auto"
            minW="20px"
            h="20px"
          >
            ×
          </IconButton>
        )}
      </Flex>

      <Stack direction="row" gap="6px" mt="8px" wrap="wrap" align="center">
        {isHost && (
          <Badge colorPalette="forest" variant="subtle">
            Host
          </Badge>
        )}
        {player.isBot && (
          <Badge colorPalette="forest" variant="outline">
            Bot
          </Badge>
        )}
        {!player.isBot && !player.connected && (
          <Badge colorPalette="forest" variant="outline">
            Offline
          </Badge>
        )}
        {hasPassed && (
          <Badge colorPalette="brand" variant="subtle">
            Passed
          </Badge>
        )}
        {showHandCount ? (
          <Text fontSize="12px" color="fg.muted" fontWeight="600">
            {player.handCount} card{player.handCount === 1 ? '' : 's'}
          </Text>
        ) : (
          !player.isBot &&
          !isHost && (
            <Badge colorPalette={player.ready ? 'brand' : 'forest'} variant={player.ready ? 'solid' : 'outline'}>
              {player.ready ? 'Ready' : 'Not ready'}
            </Badge>
          )
        )}
      </Stack>
    </Box>
  );
}
