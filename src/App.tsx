import { useState } from 'react'
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
  SimpleGrid,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'

type Page = 'title' | 'rooms' | 'game'
type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds'
type Card = { id: string; rank: string; suit: Suit; symbol: string; red?: boolean }
type Room = { name: string; players: number; password?: boolean }

const suitSymbols: Record<Suit, string> = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' }
const cards: Card[] = [
  { id: '3d', rank: '3', suit: 'diamonds', symbol: '♦', red: true },
  { id: '5s', rank: '5', suit: 'spades', symbol: '♠' },
  { id: '7h', rank: '7', suit: 'hearts', symbol: '♥', red: true },
  { id: '8c', rank: '8', suit: 'clubs', symbol: '♣' },
  { id: '10d', rank: '10', suit: 'diamonds', symbol: '♦', red: true },
  { id: 'jh', rank: 'J', suit: 'hearts', symbol: '♥', red: true },
  { id: 'qs', rank: 'Q', suit: 'spades', symbol: '♠' },
  { id: 'kc', rank: 'K', suit: 'clubs', symbol: '♣' },
]

const rooms: Room[] = [
  { name: 'Sunday night cards', players: 3 },
  { name: 'Beginner table', players: 1, password: true },
  { name: 'The green room', players: 2 },
]
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
          onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((cardId) => cardId !== id) : [...current, id])}
          onPlay={() => setSelected([])}
        />
      )}

      <Modal isOpen={createRoom.isOpen} onClose={createRoom.onClose} isCentered>
        <ModalOverlay bg="rgba(10, 34, 31, .45)" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="22px" p="8px" bg="cream" color="ink">
          <ModalHeader fontFamily="heading" fontSize="34px" fontWeight="400" pt="24px">Create Room</ModalHeader>
          <ModalCloseButton top="20px" right="20px" />
          <ModalBody>
            <VStack align="stretch" spacing="18px">
              <Field label="Room name" value={roomName} onChange={setRoomName} placeholder="e.g. Friday night cards" />
              <Field label="Password (optional)" value={roomPassword} onChange={setRoomPassword} placeholder="Leave blank for an open room" type="password" />
            </VStack>
          </ModalBody>
          <ModalFooter pt="26px" pb="18px">
            <Button onClick={confirmCreate} isDisabled={!roomName.trim()} w="100%" bg="coral" color="white" _hover={{ bg: '#d85e3d' }} borderRadius="999px" h="50px">Create room</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={joinRoom.isOpen} onClose={joinRoom.onClose} isCentered>
        <ModalOverlay bg="rgba(10, 34, 31, .45)" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="22px" p="8px" bg="cream" color="ink">
          <ModalHeader fontFamily="heading" fontSize="32px" fontWeight="400" pt="24px">Private room</ModalHeader>
          <ModalCloseButton top="20px" right="20px" />
          <ModalBody><Field label={`Password for ${roomToJoin?.name ?? 'room'}`} value={roomPassword} onChange={setRoomPassword} placeholder="Enter room password" type="password" /></ModalBody>
          <ModalFooter pt="26px" pb="18px"><Button onClick={confirmJoin} isDisabled={!roomPassword.trim()} w="100%" bg="coral" color="white" _hover={{ bg: '#d85e3d' }} borderRadius="999px" h="50px">Join room</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <Box><Text fontSize="11px" fontWeight="800" letterSpacing=".12em" textTransform="uppercase" mb="8px" color="ink" opacity=".65">{label}</Text><Input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} bg="whiteAlpha.700" border="1px solid" borderColor="blackAlpha.200" borderRadius="12px" h="48px" _focus={{ borderColor: 'coral', boxShadow: '0 0 0 1px #e86e4b' }} /></Box>
}

function TitlePage({ name, onName, onJoin }: { name: string; onName: (value: string) => void; onJoin: () => void }) {
  return <Flex minH="100vh" align="center" justify="center" px="24px" className="felt-pattern" position="relative" overflow="hidden">
    <Box position="absolute" top="-100px" right="-40px" w="280px" h="280px" borderRadius="full" border="1px solid" borderColor="whiteAlpha.200" />
    <Box position="absolute" bottom="-160px" left="-80px" w="380px" h="380px" borderRadius="full" border="1px solid" borderColor="whiteAlpha.200" />
    <VStack spacing="34px" w="full" maxW="460px" className="animate-float-in">
      <VStack spacing="8px"><Text color="whiteAlpha.700" textTransform="uppercase" letterSpacing=".28em" fontSize="11px" fontWeight="800">A tabletop for four</Text><Heading color="white" fontFamily="heading" fontWeight="400" fontSize={{ base: '78px', md: '112px' }} lineHeight=".9">Big 2</Heading><Text color="whiteAlpha.800" fontSize="14px">Play your hand. Read the table. Take the lead.</Text></VStack>
      <Box bg="cream" p={{ base: '24px', md: '30px' }} borderRadius="24px" w="full" boxShadow="0 25px 70px rgba(0,0,0,.2)"><Field label="Your name" value={name} onChange={onName} placeholder="What should we call you?" /><Button onClick={onJoin} isDisabled={!name.trim()} mt="20px" w="full" h="52px" borderRadius="999px" bg="coral" color="white" fontWeight="800" _hover={{ bg: '#d85e3d', transform: 'translateY(-1px)' }} transition="all .2s">Join the table <Box as="span" ml="8px" fontSize="18px">→</Box></Button></Box>
    </VStack>
  </Flex>
}

function RoomsPage({ onBack, onCreate, onRoom }: { onBack: () => void; onCreate: () => void; onRoom: (room: Room) => void }) {
  return <Box minH="100vh" bg="cream" px={{ base: '20px', md: '64px' }} py={{ base: '28px', md: '52px' }}><Flex maxW="900px" mx="auto" justify="space-between" align="center" mb="58px"><Button variant="ghost" onClick={onBack} color="ink" fontSize="24px" px="0" _hover={{ bg: 'transparent', transform: 'translateX(-3px)' }} transition="all .2s">←</Button><Text fontSize="12px" fontWeight="800" letterSpacing=".18em" textTransform="uppercase" opacity=".55">Lobby</Text><Button onClick={onCreate} aria-label="Create a room" w="44px" h="44px" minW="44px" borderRadius="12px" bg="ink" color="white" fontSize="28px" fontWeight="400" lineHeight="1" _hover={{ bg: '#224b46' }}>+</Button></Flex><Box maxW="900px" mx="auto"><Heading fontFamily="heading" fontWeight="400" fontSize={{ base: '58px', md: '76px' }} lineHeight=".95" mb="10px">Rooms</Heading><Text color="ink" opacity=".6" mb="34px">Find a table and pull up a chair.</Text><VStack spacing="12px" align="stretch">{rooms.map((room, index) => <Button key={room.name} onClick={() => onRoom(room)} justifyContent="space-between" alignItems="center" h="86px" px={{ base: '18px', md: '28px' }} bg="whiteAlpha.700" border="1px solid" borderColor="blackAlpha.100" borderRadius="18px" color="ink" fontWeight="600" _hover={{ bg: 'white', transform: 'translateX(4px)', boxShadow: '0 10px 25px rgba(20,47,44,.08)' }} transition="all .2s" className="animate-float-in" style={{ animationDelay: `${index * 80}ms` }}><Flex align="center" gap="16px"><Box w="9px" h="9px" borderRadius="full" bg={room.players === 4 ? 'coral' : '#7cae87'} /><Box textAlign="left"><Text fontSize={{ base: '14px', md: '16px' }}>{room.name}</Text><Text fontSize="11px" opacity=".5" mt="3px">{room.players} of 4 players {room.password && '· Private'}</Text></Box></Flex><Text fontSize="22px" fontWeight="400" opacity=".5">→</Text></Button>)}</VStack></Box></Box>
}

function GamePage({ roomName, playerName, selected, onBack, onToggle, onPlay }: { roomName: string; playerName: string; selected: string[]; onBack: () => void; onToggle: (id: string) => void; onPlay: () => void }) {
  const selectedCards = cards.filter((card) => selected.includes(card.id))
  const validCombo = isValidCombo(selectedCards)
  return <Box minH="100vh" position="relative" className="felt-pattern"><Flex justify="flex-end" position="absolute" top={{ base: '14px', md: '24px' }} left={{ base: '18px', md: '32px' }} right={{ base: '18px', md: '32px' }} zIndex="5"><Button onClick={onBack} variant="ghost" color="white" fontSize="12px" fontWeight="800" _hover={{ bg: 'whiteAlpha.200' }}>Exit</Button></Flex><Box w="100%" h="100vh" minH="560px" position="relative" overflow="hidden"><PlayerSeat position="top" name="Mina" count="11 cards" cards={5} /><PlayerSeat position="left" name="Owen" count="9 cards" cards={4} /><PlayerSeat position="right" name="Sofia" count="13 cards" cards={6} /><Box position="absolute" inset="25% 17% 28%" border="1px solid" borderColor="whiteAlpha.200" borderRadius="24px" display="flex" alignItems="center" justifyContent="center"><VStack spacing="10px"><Box px="14px" py="7px" bg="blackAlpha.200" borderRadius="999px"><Text fontSize="10px" fontWeight="800" letterSpacing=".14em" textTransform="uppercase" color="whiteAlpha.800">Mina's turn</Text></Box><Text color="whiteAlpha.500" fontSize="13px">Play a higher hand or pass</Text></VStack></Box><Box position="absolute" bottom={{ base: '112px', md: '126px' }} left="50%" transform="translateX(-50%)" w={{ base: '95%', md: '72%' }}><Hand cards={cards} selected={selected} onToggle={onToggle} /></Box><Box position="absolute" bottom="18px" left="50%" transform="translateX(-50%)" textAlign="center"><Text color="white" fontWeight="800" fontSize="13px" mb="6px">{playerName}</Text><Flex justify="center" gap="8px"><Button onClick={onPlay} isDisabled={!validCombo} h="40px" px="24px" borderRadius="999px" bg="coral" color="white" fontSize="12px" fontWeight="800" _hover={{ bg: '#d85e3d' }}>Play {selected.length > 0 && `(${selected.length})`}</Button><Button h="40px" px="22px" borderRadius="999px" bg="whiteAlpha.200" color="white" fontSize="12px" fontWeight="800" _hover={{ bg: 'whiteAlpha.300' }}>Pass</Button></Flex></Box></Box></Box>
}

function isValidCombo(hand: Card[]) {
  if (hand.length === 0) return false
  const rankCounts = hand.reduce<Record<string, number>>((counts, card) => ({ ...counts, [card.rank]: (counts[card.rank] ?? 0) + 1 }), {})
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  if (hand.length === 1) return true
  if (hand.length === 2) return counts[0] === 2
  if (hand.length === 3) return counts[0] === 3
  if (hand.length !== 5) return false

  const sameSuit = hand.every((card) => card.suit === hand[0].suit)
  const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
  const values = hand.map((card) => rankOrder.indexOf(card.rank)).sort((a, b) => a - b)
  const straight = new Set(values).size === 5 && values.every((value, index) => index === 0 || value === values[index - 1] + 1)
  return straight || sameSuit || (counts[0] === 3 && counts[1] === 2) || counts[0] === 4
}

function PlayerSeat({ position, name, count, cards: cardCount }: { position: 'top' | 'left' | 'right'; name: string; count: string; cards: number }) {
  const positionStyle = position === 'top' ? { top: '18px', left: '50%', transform: 'translateX(-50%)' } : position === 'left' ? { left: '18px', top: '50%', transform: 'translateY(-50%)' } : { right: '18px', top: '50%', transform: 'translateY(-50%)' }
  const isTop = position === 'top'
  const cardRotation = isTop ? 180 : position === 'left' ? 90 : -90
  return <Box position="absolute" {...positionStyle} textAlign="center" color="white" zIndex="2"><Flex justify="center" h={isTop ? '58px' : '136px'} w={isTop ? '120px' : '58px'} position="relative" mb="7px">{Array.from({ length: cardCount }).map((_, index) => <Box key={index} position="absolute" left={isTop ? `${index * 10 + 18}px` : '11px'} top={isTop ? '0' : `${index * 10 + 18}px`} w="34px" h="52px" borderRadius="5px" bg="#c75d4c" style={{ border: '1px solid #000', zIndex: index }} transform={`rotate(${cardRotation}deg)`}><Box w="100%" h="100%" borderRadius="5px" bg="#c75d4c" backgroundImage="linear-gradient(135deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%)" backgroundSize="9px 9px" /></Box>)}</Flex><Text fontSize="12px" fontWeight="800">{name}</Text><Text fontSize="10px" opacity=".6">{count}</Text></Box>
}

function Hand({ cards: hand, selected, onToggle }: { cards: Card[]; selected: string[]; onToggle: (id: string) => void }) {
  return <Flex justify="center" align="end" h={{ base: '100px', md: '130px' }}>{hand.map((card, index) => { const isSelected = selected.includes(card.id); return <Box key={card.id} as="button" onClick={() => onToggle(card.id)} aria-label={`${card.rank} of ${card.suit}`} position="relative" w={{ base: '48px', md: '76px' }} h={{ base: '72px', md: '112px' }} ml={index === 0 ? '0' : { base: '3px', md: '6px' }} zIndex={isSelected ? 20 : 10 + index} transform={`translateY(${isSelected ? '-20px' : '0'})`} transition="transform .18s ease"><Box h="100%" w="100%" bg="#fffdf6" borderRadius="5px" border="1px solid" borderColor="black" position="relative" overflow="hidden"><Text position="absolute" top={{ base: '5px', md: '8px' }} left={{ base: '7px', md: '10px' }} fontFamily="heading" fontSize={{ base: '18px', md: '27px' }} lineHeight="1" color={card.red ? 'coral' : 'ink'}>{card.rank}</Text><Text position="absolute" top={{ base: '23px', md: '39px' }} left={{ base: '8px', md: '11px' }} fontSize={{ base: '14px', md: '20px' }} color={card.red ? 'coral' : 'ink'}>{card.symbol}</Text><Text position="absolute" bottom={{ base: '7px', md: '9px' }} right={{ base: '7px', md: '10px' }} fontSize={{ base: '19px', md: '28px' }} color={card.red ? 'coral' : 'ink'} transform="rotate(180deg)">{card.symbol}</Text></Box></Box> })}</Flex>
}

export default App
