import { RoomView } from '@bigtwo/rules';
import { Button, Heading, Text } from '@chakra-ui/react';
import { useGame } from '../state/GameProvider.js';

export interface ResultOverlayProps {
  room: RoomView;
  winnerId: string;
}

/** Match-complete view: who won, and what to do next. */
export function ResultOverlay({ room, winnerId }: ResultOverlayProps) {
  const { playerId, newMatch, leaveRoom } = useGame();
  const winner = room.players.find((player) => player.id === winnerId);
  const youWon = winnerId === playerId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
        <Heading id="result-heading" size="xl" className="text-slate-50">
          {youWon ? 'You win!' : `${winner?.name ?? 'Someone'} wins`}
        </Heading>
        <Text className="mt-2 text-slate-400">
          {youWon ? 'You played your last card first.' : 'They played their last card first.'}
        </Text>
        <div className="mt-6 flex flex-col gap-2">
          <Button colorPalette="green" onClick={newMatch}>
            Back to lobby
          </Button>
          <Button variant="ghost" onClick={leaveRoom}>
            Leave room
          </Button>
        </div>
      </div>
    </div>
  );
}
