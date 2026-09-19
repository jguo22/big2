import { DEFAULT_BOT_SPEED_MS, MAX_BOT_SPEED_MS, MIN_BOT_SPEED_MS } from '@bigtwo/rules';
import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { LabeledInput } from '../components/LabeledInput.js';
import { useGame } from '../state/GameProvider.js';

export interface CreateRoomScreenProps {
  /** Returns to the room browser. */
  onBack: () => void;
}

/** Full-page form for creating a room, with an optional password. */
export function CreateRoomScreen({ onBack }: CreateRoomScreenProps) {
  const { createRoom, status } = useGame();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [botSpeedMs, setBotSpeedMs] = useState(String(DEFAULT_BOT_SPEED_MS));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const offline = status !== 'open';

  return (
    <Box
      minH="100dvh"
      bg="bg.canvas"
      px={{ base: '20px', md: '48px' }}
      py={{ base: '20px', md: '32px' }}
      position="relative"
    >
      <Button
        variant="ghost"
        colorPalette="forest"
        onClick={onBack}
        aria-label="Back"
        position="absolute"
        top={{ base: '16px', md: '28px' }}
        left={{ base: '10px', md: '20px' }}
        fontSize="26px"
        h="48px"
        minW="48px"
        px="0"
      >
        ←
      </Button>

      <Stack gap={{ base: '22px', md: '28px' }} maxW="560px" mx="auto">
        <Heading
          fontFamily="heading"
          fontWeight="400"
          fontSize={{ base: '52px', md: '76px' }}
          lineHeight=".9"
          textAlign="center"
        >
          New room
        </Heading>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const requested = Number(botSpeedMs);
            createRoom(name, password, {
              botSpeedMs: Number.isFinite(requested) ? requested : DEFAULT_BOT_SPEED_MS,
            });
            onBack();
          }}
        >
          <Stack gap="20px">
            <LabeledInput
              label="Room name"
              value={name}
              onValueChange={setName}
              maxLength={30}
              placeholder="Friday night cards"
            />
            <Box>
              <LabeledInput
                label="Password"
                value={password}
                onValueChange={setPassword}
                type="password"
                placeholder="Leave blank for a public room"
              />
              <Text fontSize="15px" color="fg.subtle" mt="8px">
                {password.trim()
                  ? 'Players will need this password to join.'
                  : 'Anyone can join a room without a password.'}
              </Text>
            </Box>

            <Box>
              <Button
                variant="ghost"
                colorPalette="forest"
                px="12px"
                ml="-12px"
                fontSize="15px"
                onClick={() => setAdvancedOpen((open) => !open)}
                aria-expanded={advancedOpen}
              >
                {advancedOpen ? '▾' : '▸'} Advanced settings
              </Button>
              {advancedOpen && (
                <Box mt="12px">
                  <LabeledInput
                    label="Bot play speed (ms)"
                    value={botSpeedMs}
                    onValueChange={setBotSpeedMs}
                    type="number"
                    min={MIN_BOT_SPEED_MS}
                    max={MAX_BOT_SPEED_MS}
                    placeholder={String(DEFAULT_BOT_SPEED_MS)}
                  />
                  <Text fontSize="15px" color="fg.subtle" mt="8px">
                    How long each bot waits before making its move.
                  </Text>
                </Box>
              )}
            </Box>

            <Button type="submit" colorPalette="brand" h="54px" fontSize="17px" disabled={offline}>
              Create room
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
}
