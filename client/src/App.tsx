import { Box, Flex, Stack } from '@chakra-ui/react';
import { ConnectionBanner } from './components/ConnectionBanner.js';
import { GameScreen } from './screens/GameScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { useGame } from './state/GameProvider.js';

/** Picks the screen from the server's room state. There is no client router. */
export function App() {
  const { room, status, error, dismissError } = useGame();
  const banner = <ConnectionBanner status={status} error={error} onDismissError={dismissError} />;

  // A running match takes the whole viewport; everything before it is a card
  // centred on the felt.
  if (room && room.phase !== 'lobby' && room.match) {
    return <GameScreen room={room} banner={banner} />;
  }

  return (
    <Flex
      minH="100dvh"
      align="center"
      justify="center"
      px={{ base: '16px', md: '24px' }}
      py={{ base: '32px', md: '48px' }}
      className="felt-pattern"
    >
      <Stack gap="14px" w="full" maxW={room ? '640px' : '440px'}>
        {banner}
        <Box
          bg="bg.canvas"
          borderRadius="24px"
          boxShadow="lifted"
          p={{ base: '24px', md: '32px' }}
        >
          {room ? <LobbyScreen room={room} /> : <HomeScreen />}
        </Box>
      </Stack>
    </Flex>
  );
}
