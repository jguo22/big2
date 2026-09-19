import { MAX_PLAYERS, MIN_PLAYERS, RoomView } from '@bigtwo/rules';
import { Button, Heading, Text } from '@chakra-ui/react';
import { SeatList } from '../components/SeatList.js';
import { useGame } from '../state/GameProvider.js';

export interface LobbyScreenProps {
  room: RoomView;
}

/** Pre-match room: share the code, mark ready, and let the host deal. */
export function LobbyScreen({ room }: LobbyScreenProps) {
  const { playerId, setReady, startMatch, leaveRoom, addBot, removeBot } = useGame();
  const you = room.players.find((player) => player.id === playerId);
  const isHost = room.hostId === playerId;
  const everyoneReady = room.players.every((player) => player.ready || player.id === room.hostId);
  const enoughPlayers = room.players.length >= MIN_PLAYERS;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text className="text-sm text-slate-400">Room code</Text>
          <Heading size="2xl" className="font-mono tracking-[0.3em] text-slate-50">
            {room.code}
          </Heading>
        </div>
        <Button variant="ghost" onClick={leaveRoom}>
          Leave room
        </Button>
      </div>

      <SeatList room={room} youId={playerId} onRemoveBot={isHost ? removeBot : undefined} />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {isHost && (
          <Button
            variant="outline"
            onClick={addBot}
            disabled={room.players.length >= MAX_PLAYERS}
            className="sm:mr-auto"
          >
            Add bot
          </Button>
        )}
        {!isHost && (
          <Button
            colorPalette={you?.ready ? 'gray' : 'green'}
            variant={you?.ready ? 'outline' : 'solid'}
            onClick={() => setReady(!you?.ready)}
          >
            {you?.ready ? 'Not ready' : "I'm ready"}
          </Button>
        )}
        {isHost && (
          <Button colorPalette="green" onClick={startMatch} disabled={!enoughPlayers || !everyoneReady}>
            Start match
          </Button>
        )}
      </div>

      <Text className="text-sm text-slate-500">
        {!enoughPlayers
          ? `Waiting for at least ${MIN_PLAYERS} players. Share the code above.`
          : isHost
            ? everyoneReady
              ? 'Everyone is ready.'
              : 'Waiting for the other players to be ready.'
            : 'Waiting for the host to start the match.'}
      </Text>
    </div>
  );
}
