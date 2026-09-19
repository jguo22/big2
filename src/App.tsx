import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'

type Page = 'title' | 'rooms' | 'game'
type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'
type Card = { id: string; rank: string; suit: Suit; symbol: string; red?: boolean }
type Room = { name: string; players: number; password?: boolean }

const cards: Card[] = [
  { id: '3d', rank: '3', suit: 'diamonds', symbol: '♦', red: true },
  { id: '5s', rank: '5', suit: 'spades', symbol: '♠' },
  { id: '7h', rank: '7', suit: 'hearts', symbol: '♥', red: true },
  { id: '8c', rank: '8', suit: 'clubs', symbol: '♣' },
  { id: '10d', rank: '10', suit: 'diamonds', symbol: '♦', red: true },
  { id: 'jh', rank: 'J', suit: 'hearts', symbol: '♥', red: true },
  { id: 'qs', rank: 'Q', suit: 'spades', symbol: '♠' },
  { id: 'kc', rank: 'K', suit: 'clubs', symbol: '♣' },
  { id: 'as', rank: 'A', suit: 'spades', symbol: '♠' },
  { id: '2h', rank: '2', suit: 'hearts', symbol: '♥', red: true },
  { id: '9d', rank: '9', suit: 'diamonds', symbol: '♦', red: true },
  { id: '4c', rank: '4', suit: 'clubs', symbol: '♣' },
  { id: '6s', rank: '6', suit: 'spades', symbol: '♠' },
]

const rooms: Room[] = [
  { name: 'Sunday night cards', players: 3 },
  { name: 'Beginner table', players: 1, password: true },
  { name: 'The green room', players: 2 },
]

/** Width of the centred content column on every page. */
const SHELL = '960px'

function App() {
  const [page, setPage] = useState<Page>('title')
  const [playerName, setPlayerName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [roomToJoin, setRoomToJoin] = useState<Room | null>(null)
  const [joinedRoom, setJoinedRoom] = useState('Sunday night cards')
  const createRoom = useDisclosure()
  const joinRoom = useDisclosure()

  const enterRooms = () => playerName.trim() && setPage('rooms')
  const openRoom = (room: Room) => {
    setJoinedRoom(room.name)
    if (room.password) {
      setRoomPassword('')
      setRoomToJoin(room)
      joinRoom.onOpen()
    } else setPage('game')
  }
  const confirmJoin = () => {
    joinRoom.onClose()
    setPage('game')
  }
  const confirmCreate = () => {
    setJoinedRoom(roomName.trim())
    createRoom.onClose()
    setRoomName('')
    setRoomPassword('')
    setPage('game')
  }

  return (
    <Box minH="100vh" bg="cream">
      {page === 'title' && <TitlePage name={playerName} onName={setPlayerName} onJoin={enterRooms} />}
      {page === 'rooms' && (
        <RoomsPage onBack={() => setPage('title')} onCreate={createRoom.onOpen} onRoom={openRoom} />
      )}
      {page === 'game' && (
        <GamePage
          roomName={joinedRoom}
          playerName={playerName || 'You'}
          selected={selected}
          onBack={() => setPage('rooms')}
          onToggle={(id) =>
            setSelected((current) =>
              current.includes(id) ? current.filter((cardId) => cardId !== id) : [...current, id],
            )
          }
          onPlay={() => setSelected([])}
        />
      )}

      <Dialog title="Create Room" disclosure={createRoom}>
        <VStack align="stretch" spacing="18px">
          <Field label="Room name" value={roomName} onChange={setRoomName} placeholder="e.g. Friday night cards" />
          <Field
            label="Password (optional)"
            value={roomPassword}
            onChange={setRoomPassword}
            placeholder="Leave blank for an open room"
            type="password"
          />
        </VStack>
        <PrimaryButton onClick={confirmCreate} isDisabled={!roomName.trim()} mt="26px">
          Create room
        </PrimaryButton>
      </Dialog>

      <Dialog title="Private room" disclosure={joinRoom}>
        <Field
          label={`Password for ${roomToJoin?.name ?? 'room'}`}
          value={roomPassword}
          onChange={setRoomPassword}
          placeholder="Enter room password"
          type="password"
        />
        <PrimaryButton onClick={confirmJoin} isDisabled={!roomPassword.trim()} mt="26px">
          Join room
        </PrimaryButton>
      </Dialog>
    </Box>
  )
}

/** The coral pill button used for the primary action on every screen. */
function PrimaryButton({ children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      w="100%"
      h="52px"
      borderRadius="999px"
      bg="coral"
      color="white"
      fontWeight="800"
      _hover={{ bg: '#d85e3d', transform: 'translateY(-1px)' }}
      _active={{ transform: 'translateY(0)' }}
      _disabled={{ opacity: 0.45, cursor: 'not-allowed', transform: 'none' }}
      transition="all .2s"
      {...props}
    >
      {children}
    </Button>
  )
}

/** A centred modal in the cream/ink palette. */
function Dialog({
  title,
  disclosure,
  children,
}: {
  title: string
  disclosure: ReturnType<typeof useDisclosure>
  children: ReactNode
}) {
  return (
    <Modal isOpen={disclosure.isOpen} onClose={disclosure.onClose} isCentered>
      <ModalOverlay bg="rgba(10, 34, 31, .45)" backdropFilter="blur(3px)" />
      <ModalContent borderRadius="22px" p="8px" bg="cream" color="ink" mx="20px">
        <ModalHeader fontFamily="heading" fontSize="34px" fontWeight="400" pt="24px">
          {title}
        </ModalHeader>
        <ModalCloseButton top="20px" right="20px" />
        <ModalBody pb="6px">{children}</ModalBody>
        <ModalFooter pt="14px" pb="18px" />
      </ModalContent>
    </Modal>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <Box>
      <Text
        fontSize="11px"
        fontWeight="800"
        letterSpacing=".12em"
        textTransform="uppercase"
        mb="8px"
        color="ink"
        opacity=".65"
      >
        {label}
      </Text>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        bg="whiteAlpha.700"
        border="1px solid"
        borderColor="blackAlpha.200"
        borderRadius="12px"
        h="48px"
        _focus={{ borderColor: 'coral', boxShadow: '0 0 0 1px #e86e4b' }}
      />
    </Box>
  )
}

function TitlePage({
  name,
  onName,
  onJoin,
}: {
  name: string
  onName: (value: string) => void
  onJoin: () => void
}) {
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      px="24px"
      py="40px"
      className="felt-pattern"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top="-100px"
        right="-40px"
        w="280px"
        h="280px"
        borderRadius="full"
        border="1px solid"
        borderColor="whiteAlpha.200"
      />
      <Box
        position="absolute"
        bottom="-160px"
        left="-80px"
        w="380px"
        h="380px"
        borderRadius="full"
        border="1px solid"
        borderColor="whiteAlpha.200"
      />

      <VStack spacing="34px" w="full" maxW="440px" className="animate-float-in" position="relative">
        <VStack spacing="10px" textAlign="center">
          <Text
            color="whiteAlpha.700"
            textTransform="uppercase"
            letterSpacing=".28em"
            fontSize="11px"
            fontWeight="800"
          >
            A tabletop for four
          </Text>
          <Heading
            color="white"
            fontFamily="heading"
            fontWeight="400"
            fontSize={{ base: '72px', md: '108px' }}
            lineHeight=".9"
          >
            Big 2
          </Heading>
          <Text color="whiteAlpha.800" fontSize="14px">
            Play your hand. Read the table. Take the lead.
          </Text>
        </VStack>

        <Box
          bg="cream"
          p={{ base: '24px', md: '30px' }}
          borderRadius="24px"
          w="full"
          boxShadow="0 25px 70px rgba(0,0,0,.2)"
        >
          <Field label="Your name" value={name} onChange={onName} placeholder="What should we call you?" />
          <PrimaryButton onClick={onJoin} isDisabled={!name.trim()} mt="20px">
            Join the table
            <Box as="span" ml="8px" fontSize="18px">
              →
            </Box>
          </PrimaryButton>
        </Box>
      </VStack>
    </Flex>
  )
}

function RoomsPage({
  onBack,
  onCreate,
  onRoom,
}: {
  onBack: () => void
  onCreate: () => void
  onRoom: (room: Room) => void
}) {
  return (
    <Box minH="100vh" bg="cream" px={{ base: '20px', md: '40px' }} py={{ base: '24px', md: '44px' }}>
      <Flex maxW={SHELL} mx="auto" justify="space-between" align="center" mb={{ base: '36px', md: '52px' }}>
        <Button
          variant="ghost"
          onClick={onBack}
          color="ink"
          fontSize="24px"
          px="0"
          aria-label="Back"
          _hover={{ bg: 'transparent', transform: 'translateX(-3px)' }}
          transition="all .2s"
        >
          ←
        </Button>
        <Text fontSize="12px" fontWeight="800" letterSpacing=".18em" textTransform="uppercase" opacity=".55">
          Lobby
        </Text>
        <Button
          onClick={onCreate}
          aria-label="Create a room"
          w="44px"
          h="44px"
          minW="44px"
          borderRadius="12px"
          bg="ink"
          color="white"
          fontSize="28px"
          fontWeight="400"
          lineHeight="1"
          _hover={{ bg: '#224b46' }}
        >
          +
        </Button>
      </Flex>

      <Box maxW={SHELL} mx="auto" textAlign="center">
        <Heading
          fontFamily="heading"
          fontWeight="400"
          fontSize={{ base: '56px', md: '76px' }}
          lineHeight=".95"
          mb="10px"
        >
          Rooms
        </Heading>
        <Text color="ink" opacity=".6" mb={{ base: '28px', md: '36px' }}>
          Find a table and pull up a chair.
        </Text>
      </Box>

      <VStack spacing="12px" align="stretch" maxW="680px" mx="auto">
        {rooms.map((room, index) => (
          <Button
            key={room.name}
            onClick={() => onRoom(room)}
            justifyContent="space-between"
            alignItems="center"
            h="86px"
            px={{ base: '18px', md: '28px' }}
            bg="whiteAlpha.700"
            border="1px solid"
            borderColor="blackAlpha.100"
            borderRadius="18px"
            color="ink"
            fontWeight="600"
            _hover={{ bg: 'white', transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(20,47,44,.10)' }}
            transition="all .2s"
            className="animate-float-in"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <Flex align="center" gap="16px">
              <Box w="9px" h="9px" borderRadius="full" bg={room.players === 4 ? 'coral' : '#7cae87'} />
              <Box textAlign="left">
                <Text fontSize={{ base: '14px', md: '16px' }}>{room.name}</Text>
                <Text fontSize="11px" opacity=".5" mt="3px">
                  {room.players} of 4 players {room.password && '· Private'}
                </Text>
              </Box>
            </Flex>
            <Text fontSize="22px" fontWeight="400" opacity=".5">
              →
            </Text>
          </Button>
        ))}
      </VStack>
    </Box>
  )
}

function GamePage({
  roomName,
  playerName,
  selected,
  onBack,
  onToggle,
  onPlay,
}: {
  roomName: string
  playerName: string
  selected: string[]
  onBack: () => void
  onToggle: (id: string) => void
  onPlay: () => void
}) {
  const selectedCards = cards.filter((card) => selected.includes(card.id))
  const validCombo = isValidCombo(selectedCards)

  return (
    <Flex minH="100vh" direction="column" className="felt-pattern" overflow="hidden">
      <Flex
        as="header"
        w="full"
        maxW={SHELL}
        mx="auto"
        px={{ base: '18px', md: '32px' }}
        py={{ base: '14px', md: '20px' }}
        align="center"
        justify="space-between"
        gap="12px"
      >
        <Box w="64px" />
        <Text
          color="whiteAlpha.800"
          fontSize="11px"
          fontWeight="800"
          letterSpacing=".18em"
          textTransform="uppercase"
          textAlign="center"
          noOfLines={1}
        >
          {roomName}
        </Text>
        <Button
          onClick={onBack}
          variant="ghost"
          w="64px"
          color="white"
          fontSize="12px"
          fontWeight="800"
          _hover={{ bg: 'whiteAlpha.200' }}
        >
          Exit
        </Button>
      </Flex>

      {/* The table: a centred box that the three opponent seats anchor to, so
          the layout holds together instead of tracking the viewport edges. */}
      <Flex flex="1" align="center" justify="center" px={{ base: '16px', md: '32px' }} py="8px">
        <Box
          position="relative"
          w="full"
          maxW="720px"
          minH={{ base: '300px', md: '380px' }}
          px={{ base: '58px', md: '84px' }}
          py={{ base: '74px', md: '88px' }}
        >
          <PlayerSeat position="top" name="Mina" count="11 cards" cards={5} />
          <PlayerSeat position="left" name="Owen" count="9 cards" cards={4} />
          <PlayerSeat position="right" name="Sofia" count="13 cards" cards={6} />

          <Flex
            h="full"
            minH={{ base: '150px', md: '200px' }}
            align="center"
            justify="center"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="24px"
            bg="whiteAlpha.50"
          >
            <VStack spacing="10px" px="16px" textAlign="center">
              <Box px="14px" py="7px" bg="blackAlpha.300" borderRadius="999px">
                <Text
                  fontSize="10px"
                  fontWeight="800"
                  letterSpacing=".14em"
                  textTransform="uppercase"
                  color="whiteAlpha.900"
                >
                  Mina's turn
                </Text>
              </Box>
              <Text color="whiteAlpha.600" fontSize="13px">
                Play a higher hand or pass
              </Text>
            </VStack>
          </Flex>
        </Box>
      </Flex>

      <VStack
        as="footer"
        spacing={{ base: '14px', md: '18px' }}
        w="full"
        maxW={SHELL}
        mx="auto"
        px={{ base: '12px', md: '32px' }}
        pt="6px"
        pb={{ base: '18px', md: '26px' }}
      >
        <Hand cards={cards} selected={selected} onToggle={onToggle} />

        <VStack spacing="8px">
          <Text color="white" fontWeight="800" fontSize="13px">
            {playerName}
          </Text>
          <Flex justify="center" gap="8px">
            <Button
              onClick={onPlay}
              isDisabled={!validCombo}
              h="42px"
              px="26px"
              borderRadius="999px"
              bg="coral"
              color="white"
              fontSize="12px"
              fontWeight="800"
              _hover={{ bg: '#d85e3d' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
            >
              Play {selected.length > 0 && `(${selected.length})`}
            </Button>
            <Button
              h="42px"
              px="24px"
              borderRadius="999px"
              bg="whiteAlpha.200"
              color="white"
              fontSize="12px"
              fontWeight="800"
              _hover={{ bg: 'whiteAlpha.300' }}
            >
              Pass
            </Button>
          </Flex>
        </VStack>
      </VStack>
    </Flex>
  )
}

function isValidCombo(hand: Card[]) {
  if (hand.length === 0) return false
  const rankCounts = hand.reduce<Record<string, number>>(
    (counts, card) => ({ ...counts, [card.rank]: (counts[card.rank] ?? 0) + 1 }),
    {},
  )
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  if (hand.length === 1) return true
  if (hand.length === 2) return counts[0] === 2
  if (hand.length === 3) return counts[0] === 3
  if (hand.length !== 5) return false

  const sameSuit = hand.every((card) => card.suit === hand[0].suit)
  const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
  const values = hand.map((card) => rankOrder.indexOf(card.rank)).sort((a, b) => a - b)
  const straight =
    new Set(values).size === 5 && values.every((value, index) => index === 0 || value === values[index - 1] + 1)
  return straight || sameSuit || (counts[0] === 3 && counts[1] === 2) || counts[0] === 4
}

function PlayerSeat({
  position,
  name,
  count,
  cards: cardCount,
}: {
  position: 'top' | 'left' | 'right'
  name: string
  count: string
  cards: number
}) {
  const anchor =
    position === 'top'
      ? { top: '0', left: '50%', transform: 'translateX(-50%)' }
      : position === 'left'
        ? { left: '0', top: '50%', transform: 'translateY(-50%)' }
        : { right: '0', top: '50%', transform: 'translateY(-50%)' }
  const isTop = position === 'top'
  const cardRotation = isTop ? 180 : position === 'left' ? 90 : -90

  return (
    <Box position="absolute" {...anchor} textAlign="center" color="white" zIndex="2">
      <Flex
        justify="center"
        h={isTop ? '54px' : '128px'}
        w={isTop ? '112px' : '54px'}
        position="relative"
        mb="7px"
        mx="auto"
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <Box
            key={index}
            position="absolute"
            left={isTop ? `${index * 10 + 14}px` : '10px'}
            top={isTop ? '0' : `${index * 10 + 14}px`}
            w="32px"
            h="48px"
            borderRadius="5px"
            bg="#c75d4c"
            style={{ border: '1px solid rgba(0,0,0,.55)', zIndex: index }}
            transform={`rotate(${cardRotation}deg)`}
          >
            <Box
              w="100%"
              h="100%"
              borderRadius="5px"
              bg="#c75d4c"
              backgroundImage="linear-gradient(135deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%)"
              backgroundSize="9px 9px"
            />
          </Box>
        ))}
      </Flex>
      <Text fontSize="12px" fontWeight="800">
        {name}
      </Text>
      <Text fontSize="10px" opacity=".6">
        {count}
      </Text>
    </Box>
  )
}

function Hand({
  cards: hand,
  selected,
  onToggle,
}: {
  cards: Card[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    // pt leaves room for a selected card to lift without being clipped.
    <Flex justify="center" align="flex-end" w="full" pt="20px" px="6px">
      {hand.map((card, index) => {
        const isSelected = selected.includes(card.id)
        const cardColor = card.red ? 'coral' : 'ink'
        return (
          <Box
            key={card.id}
            as="button"
            onClick={() => onToggle(card.id)}
            aria-label={`${card.rank} of ${card.suit}`}
            aria-pressed={isSelected}
            position="relative"
            flex="0 0 auto"
            w="clamp(38px, 6vw, 66px)"
            aspectRatio="2 / 3"
            ml={index === 0 ? '0' : 'clamp(-18px, -1.6vw, -6px)'}
            transform={isSelected ? 'translateY(-16px)' : 'translateY(0)'}
            transition="transform .16s ease-out"
            zIndex={isSelected ? 20 : index}
            _hover={{ transform: isSelected ? 'translateY(-16px)' : 'translateY(-7px)' }}
            _focusVisible={{ outline: '2px solid #e86e4b', outlineOffset: '2px' }}
          >
            <Box
              h="100%"
              w="100%"
              bg="#fffdf6"
              border="1px solid"
              borderColor={isSelected ? 'coral' : 'blackAlpha.400'}
              borderRadius="6px"
              position="relative"
              overflow="hidden"
              className="card-shadow"
            >
              <Text
                position="absolute"
                top="6%"
                left="9%"
                fontFamily="heading"
                fontSize="clamp(13px, 1.7vw, 22px)"
                lineHeight=".9"
                color={cardColor}
              >
                {card.rank}
              </Text>
              <Text
                position="absolute"
                inset="0"
                display="flex"
                alignItems="center"
                justifyContent="center"
                pt="14%"
                color={cardColor}
                fontSize="clamp(22px, 3.2vw, 42px)"
                lineHeight="1"
              >
                {card.symbol}
              </Text>
            </Box>
          </Box>
        )
      })}
    </Flex>
  )
}

export default App
