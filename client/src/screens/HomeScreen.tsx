import { Box, Button, Flex, Heading, Stack } from '@chakra-ui/react';
import { useState } from 'react';
import { LabeledInput } from '../components/LabeledInput.js';
import { useGame } from '../state/GameProvider.js';

/** Name entry plus room creation and joining. */
export function HomeScreen() {
  const { name, setName, createRoom, joinRoom, status } = useGame();
  const [draftName, setDraftName] = useState(name);
  const [code, setCode] = useState('');
  const offline = status !== 'open';

  const commitName = () => {
    const next = draftName.trim();
    if (next && next !== name) setName(next);
  };

  return (
    <Stack gap="26px">
      <Heading
        fontFamily="heading"
        fontWeight="400"
        fontSize={{ base: '56px', md: '68px' }}
        lineHeight=".95"
        textAlign="center"
      >
        Big 2
      </Heading>

      <LabeledInput
        label="Your name"
        value={draftName}
        onValueChange={setDraftName}
        onBlur={commitName}
        maxLength={20}
        placeholder="What should we call you?"
      />

      <Stack gap="16px">
        <Button
          colorPalette="brand"
          size="lg"
          h="52px"
          borderRadius="pill"
          fontWeight="800"
          disabled={offline}
          onClick={() => {
            commitName();
            createRoom();
          }}
        >
          Create a room
        </Button>

        <Flex align="center" gap="12px" color="fg.subtle" fontSize="11px" fontWeight="700">
          <Box h="1px" flex="1" bg="border.subtle" />
          OR
          <Box h="1px" flex="1" bg="border.subtle" />
        </Flex>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            commitName();
            if (code.trim()) joinRoom(code.trim());
          }}
        >
          <Flex gap="10px" align="flex-end">
            <Box flex="1">
              <LabeledInput
                label="Room code"
                value={code}
                onValueChange={(next) => setCode(next.toUpperCase())}
                maxLength={4}
                placeholder="ABCD"
                fontWeight="700"
              />
            </Box>
            <Button
              type="submit"
              colorPalette="forest"
              variant="outline"
              size="lg"
              h="50px"
              borderRadius="12px"
              fontWeight="800"
              disabled={offline || code.trim().length === 0}
            >
              Join
            </Button>
          </Flex>
        </form>
      </Stack>
    </Stack>
  );
}
