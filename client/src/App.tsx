import { ConnectionBanner } from './components/ConnectionBanner.js';
import { GameScreen } from './screens/GameScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { useGame } from './state/GameProvider.js';

/** Picks the screen from the server's room state. There is no client router. */
export function App() {
  const { room, status, error, dismissError } = useGame();

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <ConnectionBanner status={status} error={error} onDismissError={dismissError} />
        {!room ? (
          <HomeScreen />
        ) : room.phase === 'lobby' || !room.match ? (
          <LobbyScreen room={room} />
        ) : (
          <GameScreen room={room} />
        )}
      </div>
    </main>
  );
}
