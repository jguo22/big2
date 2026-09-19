import { Button, Heading, Input, Text } from '@chakra-ui/react';
import { useState } from 'react';
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <Heading size="2xl" className="text-slate-50">
          Big Two
        </Heading>
        <Text className="text-slate-400">Play with 2 to 4 people. First to empty their hand wins.</Text>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-300">Your name</span>
        <Input
          value={draftName}
          maxLength={20}
          placeholder="Player"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitName}
        />
      </label>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <Button
          colorPalette="green"
          disabled={offline}
          onClick={() => {
            commitName();
            createRoom();
          }}
        >
          Create a room
        </Button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          or
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            commitName();
            if (code.trim()) joinRoom(code.trim());
          }}
        >
          <Input
            value={code}
            maxLength={4}
            placeholder="Room code"
            aria-label="Room code"
            className="uppercase"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <Button type="submit" variant="outline" disabled={offline || code.trim().length === 0}>
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}
