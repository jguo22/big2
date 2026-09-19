import { Box, Flex, Stack } from '@chakra-ui/react';
import { useState } from 'react';
import { ConnectionBanner } from './components/ConnectionBanner.js';
import { CreateRoomScreen } from './screens/CreateRoomScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { RoomsScreen } from './screens/RoomsScreen.js';
import { useGame } from './state/GameProvider.js';

/** Which pre-game page is showing. Being in a room or a match overrides this. */
type View = 'name' | 'rooms' | 'create';

/** Picks the screen from the server's room state. There is no client router. */
export function App() {
  const { room, name, status, error, dismissError } = useGame();
  // Name entry gates the room browser; a remembered name skips straight past it.
  const [view, setView] = useState<View>(() => (name.trim().length > 0 ? 'rooms' : 'name'));

  return (
    <>
      {/* Floats above every screen, so connection changes never reflow them. */}
      <ConnectionBanner status={status} error={error} onDismissError={dismissError} />
      {renderScreen()}
    </>
  );

  function renderScreen() {
    // Every screen after name entry fills the viewport.
    if (room && room.phase !== 'lobby' && room.match) return <GameScreen room={room} />;
    if (room) return <LobbyScreen room={room} />;
    if (view === 'create') return <CreateRoomScreen onBack={() => setView('rooms')} />;
    if (view === 'rooms') {
      return <RoomsScreen onBack={() => setView('name')} onCreate={() => setView('create')} />;
    }

    // Name entry is the one screen small enough to sit in a card on the felt.
    return (
      <Flex
        minH="100dvh"
        align="center"
        justify="center"
        px={{ base: '16px', md: '24px' }}
        py={{ base: '32px', md: '48px' }}
        className="felt-pattern"
      >
        <Stack gap="14px" w="full" maxW="440px">
          <Box bg="bg.canvas" borderRadius="24px" boxShadow="lifted" p={{ base: '24px', md: '32px' }}>
            <HomeScreen onContinue={() => setView('rooms')} />
          </Box>
        </Stack>
      </Flex>
    );
  }
}
