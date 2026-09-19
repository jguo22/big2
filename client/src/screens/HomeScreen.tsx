import { Button, Heading, Stack } from '@chakra-ui/react';
import { useState } from 'react';
import { LabeledInput } from '../components/LabeledInput.js';
import { useGame } from '../state/GameProvider.js';

export interface HomeScreenProps {
  /** Called once a name has been committed, to open the room browser. */
  onContinue: () => void;
}

/** Name entry. Everything else happens in the room browser. */
export function HomeScreen({ onContinue }: HomeScreenProps) {
  const { name, setName, status } = useGame();
  const [draftName, setDraftName] = useState(name);
  const ready = draftName.trim().length > 0 && status === 'open';

  const submit = () => {
    if (!ready) return;
    if (draftName.trim() !== name) setName(draftName.trim());
    onContinue();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
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
          maxLength={20}
          placeholder="What should we call you?"
        />

        <Button type="submit" colorPalette="brand" size="lg" h="52px" disabled={!ready}>
          Join the table
        </Button>
      </Stack>
    </form>
  );
}
