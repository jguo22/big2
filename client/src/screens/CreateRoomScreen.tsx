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
            createRoom(name, password);
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

            <Button type="submit" colorPalette="brand" h="54px" fontSize="17px" disabled={offline}>
              Create room
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
}
