import { RoomSummary } from '@bigtwo/rules';
import { Badge, Box, Button, chakra, Flex, Heading, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { useGame } from '../state/GameProvider.js';

/** A real <button> with Chakra style props, so `type` and `disabled` type-check. */
const RowButton = chakra('button');

/**
 * Fixed card height. Both the room summary and the password prompt render
 * inside it, so opening the prompt cannot resize the card or reflow the grid
 * row it sits in.
 */
const CARD_HEIGHT = '190px';

export interface RoomsScreenProps {
  /** Returns to name entry. */
  onBack: () => void;
  /** Opens the create-room page. */
  onCreate: () => void;
}

/**
 * The room browser. Owns the whole viewport rather than sitting in a card, so
 * the list has room to breathe and fills the width on a desktop.
 */
export function RoomsScreen({ onBack, onCreate }: RoomsScreenProps) {
  const { rooms, joinRoom, status } = useGame();
  // Code of the private room awaiting its password, if any.
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const offline = status !== 'open';

  const open = (room: RoomSummary) => {
    if (room.isPrivate) setJoiningCode(room.code);
    else joinRoom(room.code);
  };

  return (
    <Box
      minH="100dvh"
      bg="bg.canvas"
      px={{ base: '20px', md: '48px' }}
      py={{ base: '20px', md: '32px' }}
      position="relative"
    >
      {/* In the page margin rather than a header row, so the heading sits at the very top. */}
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

      <Stack gap={{ base: '22px', md: '28px' }} maxW="1100px" mx="auto">
        <Heading
          fontFamily="heading"
          fontWeight="400"
          fontSize={{ base: '60px', md: '88px' }}
          lineHeight=".9"
          textAlign="center"
        >
          Rooms
        </Heading>

        <Flex align="center" justify="space-between" gap="16px" wrap="wrap">
          <Text fontSize={{ base: '22px', md: '28px' }} fontWeight="600" color="fg.muted">
            {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} open
          </Text>
          <Button colorPalette="forest" h="58px" px="36px" fontSize="19px" onClick={onCreate} disabled={offline}>
            New room
          </Button>
        </Flex>

        {rooms.length === 0 ? (
          <Flex
            align="center"
            justify="center"
            minH="220px"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="border.subtle"
            borderRadius="20px"
          >
            <Text fontSize="18px" color="fg.subtle">
              No rooms yet. Create one to get started.
            </Text>
          </Flex>
        ) : (
          <SimpleGrid minChildWidth="300px" gap="14px" as="ul" listStyleType="none">
            {rooms.map((room) => (
              <Box as="li" key={room.code}>
                <RoomCard
                  room={room}
                  disabled={offline}
                  isJoining={joiningCode === room.code}
                  onOpen={() => open(room)}
                  onCancel={() => setJoiningCode(null)}
                  onJoin={(password) => joinRoom(room.code, password)}
                />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Box>
  );
}

interface RoomCardProps {
  room: RoomSummary;
  disabled: boolean;
  /** Swaps the card's contents for the password prompt, at the same size. */
  isJoining: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onJoin: (password: string) => void;
}

function RoomCard({ room, disabled, isJoining, onOpen, onCancel, onJoin }: RoomCardProps) {
  const full = room.playerCount >= room.maxPlayers;
  const inPlay = room.phase !== 'lobby';
  const joinable = !full && !inPlay;

  return (
    <Box
      position="relative"
      h={CARD_HEIGHT}
      overflow="hidden"
      px={{ base: '18px', md: '22px' }}
      py="18px"
      bg={isJoining ? 'white' : 'bg.surface'}
      borderWidth="1px"
      borderColor={isJoining ? 'brand.solid' : 'border.subtle'}
      borderRadius="20px"
      opacity={joinable ? 1 : 0.55}
      transition="background .18s, border-color .18s, transform .18s, box-shadow .18s"
      _hover={joinable && !isJoining ? { bg: 'white', transform: 'translateY(-3px)', boxShadow: 'card' } : undefined}
    >
      {isJoining ? (
        <PasswordPrompt room={room} disabled={disabled} onCancel={onCancel} onJoin={onJoin} />
      ) : (
        <>
          {/* Covers the card so the whole thing is one click target, while the
              content below stays ordinary text rather than button innards. */}
          <RowButton
            type="button"
            onClick={onOpen}
            disabled={disabled || !joinable}
            aria-label={`Join ${room.name}`}
            position="absolute"
            inset="0"
            zIndex="1"
            borderRadius="20px"
            cursor={joinable ? 'pointer' : 'not-allowed'}
            _focusVisible={{ outline: '2px solid', outlineColor: 'brand.solid', outlineOffset: '2px' }}
          />
          <RoomSummaryContent room={room} full={full} inPlay={inPlay} />
        </>
      )}
    </Box>
  );
}

function RoomSummaryContent({
  room,
  full,
  inPlay,
}: {
  room: RoomSummary;
  full: boolean;
  inPlay: boolean;
}) {
  return (
    <Flex direction="column" justify="space-between" h="full">
      <Box minW="0">
        {/* One fixed-height line: a second row of badges would push the name
            down inside a card whose height cannot grow. */}
        <Flex align="center" gap="8px" mb="8px" h="22px" overflow="hidden">
          <Badge colorPalette={room.isPrivate ? 'brand' : 'forest'} variant={room.isPrivate ? 'solid' : 'subtle'}>
            {room.isPrivate ? 'Private' : 'Public'}
          </Badge>
          {inPlay && (
            <Badge colorPalette="forest" variant="outline">
              In play
            </Badge>
          )}
          {full && !inPlay && (
            <Badge colorPalette="forest" variant="outline">
              Full
            </Badge>
          )}
        </Flex>
        <Text fontFamily="heading" fontWeight="400" fontSize="28px" lineHeight="1.15" truncate>
          {room.name}
        </Text>
        <Text fontSize="15px" color="fg.subtle" mt="5px">
          {room.hostName} · {room.code}
        </Text>
      </Box>

      <Flex align="center" justify="space-between" gap="12px">
        <Flex align="center" gap="7px">
          {Array.from({ length: room.maxPlayers }).map((_, index) => (
            <Box
              key={index}
              w="9px"
              h="9px"
              borderRadius="full"
              bg={index < room.playerCount ? 'brand.solid' : 'border.subtle'}
            />
          ))}
          <Text fontSize="15px" fontWeight="700" color="fg.muted" ml="5px">
            {room.playerCount}/{room.maxPlayers}
          </Text>
        </Flex>
        <Text fontSize="21px" color="fg.subtle">
          {room.isPrivate ? '🔒' : '→'}
        </Text>
      </Flex>
    </Flex>
  );
}

/** The password prompt, sized to fit the card it replaces. */
function PasswordPrompt({
  room,
  disabled,
  onCancel,
  onJoin,
}: {
  room: RoomSummary;
  disabled: boolean;
  onCancel: () => void;
  onJoin: (password: string) => void;
}) {
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onJoin(password);
      }}
      style={{ height: '100%' }}
    >
      <Flex direction="column" justify="center" gap="10px" h="full">
        <Text fontSize="13px" fontWeight="800" letterSpacing=".1em" textTransform="uppercase" color="fg.muted" truncate>
          {room.name}
        </Text>

        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          autoFocus
          h="46px"
          fontSize="16px"
          bg="white"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="12px"
          _placeholder={{ color: 'fg.subtle' }}
          _focusVisible={{
            borderColor: 'brand.solid',
            outline: '2px solid',
            outlineColor: 'brand.muted',
            outlineOffset: '0px',
          }}
        />

        <Flex gap="8px">
          <Button
            type="submit"
            colorPalette="brand"
            flex="1"
            h="42px"
            fontSize="15px"
            disabled={disabled || !password.trim()}
          >
            Enter
          </Button>
          <Button colorPalette="forest" variant="ghost" h="42px" fontSize="15px" onClick={onCancel}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
