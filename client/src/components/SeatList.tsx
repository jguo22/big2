import { PublicPlayer, RoomView } from '@bigtwo/rules';
import { Badge } from '@chakra-ui/react';

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
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Players">
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
    </ul>
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
    <li
      aria-current={isTurn ? 'true' : undefined}
      className={[
        'rounded-xl border p-3 transition-colors',
        isTurn
          ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]'
          : 'border-slate-700 bg-slate-800/60',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${player.connected ? 'bg-emerald-400' : 'bg-slate-500'}`}
        />
        <span className="truncate font-medium text-slate-100">
          {player.name}
          {isYou ? ' (you)' : ''}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(player.id)}
            aria-label={`Remove ${player.name}`}
            className="ml-auto shrink-0 rounded px-1 text-slate-400 hover:text-rose-300"
          >
            &times;
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {isHost && <Badge colorPalette="purple">Host</Badge>}
        {player.isBot && <Badge colorPalette="blue">Bot</Badge>}
        {!player.isBot && !player.connected && <Badge colorPalette="gray">Offline</Badge>}
        {showHandCount ? (
          <span className="text-slate-300">
            {player.handCount} card{player.handCount === 1 ? '' : 's'}
          </span>
        ) : (
          <Badge colorPalette={player.ready ? 'green' : 'gray'}>{player.ready ? 'Ready' : 'Not ready'}</Badge>
        )}
        {hasPassed && <Badge colorPalette="orange">Passed</Badge>}
      </div>
    </li>
  );
}
