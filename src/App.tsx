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
import { createMatch, passTurn, playCards, type Card as GameCard, type MatchState, type Player } from './game'

type Page = 'title' | 'rooms' | 'game'
type Card = GameCard
type Room = { name: string; players: number; password?: boolean }

const cards: Card[] = [
  { id: '3-diamonds', rank: '3', suit: 'diamonds' },
  { id: '5s', rank: '5', suit: 'spades' },
  { id: '7h', rank: '7', suit: 'hearts' },
  { id: '8c', rank: '8', suit: 'clubs' },
  { id: '10d', rank: '10', suit: 'diamonds' },
  { id: 'jh', rank: 'J', suit: 'hearts' },
  { id: 'qs', rank: 'Q', suit: 'spades' },
  { id: 'kc', rank: 'K', suit: 'clubs' },
  { id: 'as', rank: 'A', suit: 'spades' },
  { id: '2h', rank: '2', suit: 'hearts' },
  { id: '9d', rank: '9', suit: 'diamonds' },
  { id: '4c', rank: '4', suit: 'clubs' },
  { id: '6s', rank: '6', suit: 'spades' },
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
  const [match, setMatch] = useState<MatchState>(() => createDemoMatch())
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
          match={match}
          selected={selected}
          onBack={() => setPage('rooms')}
          onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((cardId) => cardId !== id) : [...current, id])}
          onPlay={() => {
            const result = playCards(match, 'you', selected)
            if (result.ok) {
              setMatch(result.state)
              setSelected([])
            }
          }}
          onPass={() => {
            const nextState = passTurn(match, 'you')
            if (nextState) setMatch(nextState)
          }}
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

function createDemoMatch() {
  const players: Player[] = [
    { id: 'you', name: 'You', hand: cards, connected: true },
    { id: 'mina', name: 'Mina', hand: [], connected: true },
    { id: 'owen', name: 'Owen', hand: [], connected: true },
    { id: 'sofia', name: 'Sofia', hand: [], connected: true },
  ]
  return createMatch(players)
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

function GamePage({ roomName, playerName, match, selected, onBack, onToggle, onPlay, onPass }: { roomName: string; playerName: string; match: MatchState; selected: string[]; onBack: () => void; onToggle: (id: string) => void; onPlay: () => void; onPass: () => void }) {
  const you = match.players.find((player) => player.id === 'you')
  const canAct = match.currentPlayerId === 'you' && !match.winnerId
  return <Box minH="100vh" position="relative" className="felt-pattern"><Flex justify="flex-end" position="absolute" top={{ base: '14px', md: '24px' }} left={{ base: '18px', md: '32px' }} right={{ base: '18px', md: '32px' }} zIndex="5"><Button onClick={onBack} variant="ghost" color="white" fontSize="12px" fontWeight="800" _hover={{ bg: 'whiteAlpha.200' }}>Exit</Button></Flex><Box w="100%" h="100vh" minH="560px" position="relative" overflow="hidden"><PlayerSeat position="top" name="Mina" count="11 cards" cards={5} /><PlayerSeat position="left" name="Owen" count="9 cards" cards={4} /><PlayerSeat position="right" name="Sofia" count="13 cards" cards={6} /><Box position="absolute" inset="18% 10% 31%" zIndex="1" border="1px solid" borderColor="whiteAlpha.200" borderRadius="24px" display="flex" alignItems="center" justifyContent="center"><PlayedArea plays={match.playedHands} currentPlayerId={match.currentPlayerId} /></Box><Box position="absolute" top="80%" left="50%" transform="translate(-50%, -50%)" w="74vw" zIndex="0"><Hand cards={you?.hand ?? []} selected={selected} onToggle={onToggle} /></Box><Box position="absolute" bottom="18px" left="50%" transform="translateX(-50%)" textAlign="center"><Text color="white" fontWeight="800" fontSize="13px" mb="6px">{playerName} · {you?.hand.length ?? 0} cards</Text><Flex justify="center" gap="8px"><Button onClick={onPlay} isDisabled={!canAct || selected.length === 0} h="40px" px="24px" borderRadius="999px" bg="coral" color="white" fontSize="12px" fontWeight="800" _hover={{ bg: '#d85e3d' }}>Play {selected.length > 0 && `(${selected.length})`}</Button><Button onClick={onPass} isDisabled={!canAct || !match.currentPlay} h="40px" px="22px" borderRadius="999px" bg="whiteAlpha.200" color="white" fontSize="12px" fontWeight="800" _hover={{ bg: 'whiteAlpha.300' }}>Pass</Button></Flex></Box></Box></Box>
}

function PlayedArea({ plays, currentPlayerId }: { plays: MatchState['playedHands']; currentPlayerId: string }) {
  const latestPlays = plays.slice(-3)
  return <VStack spacing="14px" w="full" px={{ base: '12px', md: '30px' }}><Text color="whiteAlpha.700" fontSize="10px" fontWeight="800" letterSpacing=".16em" textTransform="uppercase">{latestPlays.length > 0 ? `${latestPlays.at(-1)?.playerName}'s play` : 'The table is ready'}</Text>{latestPlays.length > 0 ? <Flex justify="center" align="end" h={{ base: '112px', md: '148px' }} w="full">{latestPlays.map((played, playIndex) => <Box key={`${played.playerId}-${playIndex}`} position="relative" ml={playIndex === 0 ? '0' : { base: '-28px', md: '-42px' }} zIndex={playIndex} transform={`translateY(${playIndex === latestPlays.length - 1 ? '0' : '12px'}) scale(${playIndex === latestPlays.length - 1 ? 1 : .82})`} opacity={playIndex === latestPlays.length - 1 ? 1 : .48} transformOrigin="bottom center"><Text textAlign="center" color="whiteAlpha.700" fontSize="10px" mb="4px">{played.playerName}</Text><PlayedHand cards={played.combination.cards} /></Box>)}</Flex> : <Text color="whiteAlpha.500" fontSize="13px">{currentPlayerId === 'you' ? 'Choose cards from your hand to lead' : 'Waiting for the next play'}</Text>}</VStack>
}

function PlayedHand({ cards: hand }: { cards: GameCard[] }) {
  return <Flex justify="center" h={{ base: '76px', md: '100px' }}>{hand.map((card, index) => <CardFace key={card.id} card={card} played index={index} />)}</Flex>
}

function PlayerSeat({ position, name, count, cards: cardCount }: { position: 'top' | 'left' | 'right'; name: string; count: string; cards: number }) {
  const positionStyle = position === 'top' ? { top: '18px', left: '50%', transform: 'translateX(-50%)' } : position === 'left' ? { left: '18px', top: '50%', transform: 'translateY(-50%)' } : { right: '18px', top: '50%', transform: 'translateY(-50%)' }
  const isTop = position === 'top'
  const cardRotation = isTop ? 180 : position === 'left' ? 90 : -90
  return <Box position="absolute" {...positionStyle} textAlign="center" color="white" zIndex="2"><Flex justify="center" h={isTop ? '58px' : '136px'} w={isTop ? '120px' : '58px'} position="relative" mb="7px">{Array.from({ length: cardCount }).map((_, index) => <Box key={index} position="absolute" left={isTop ? `${index * 10 + 18}px` : '11px'} top={isTop ? '0' : `${index * 10 + 18}px`} w="34px" h="52px" borderRadius="5px" bg="#c75d4c" style={{ border: '1px solid #000', zIndex: index }} transform={`rotate(${cardRotation}deg)`}><Box w="100%" h="100%" borderRadius="5px" bg="#c75d4c" backgroundImage="linear-gradient(135deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%), linear-gradient(45deg, transparent 42%, rgba(255,255,255,.18) 43%, transparent 45%)" backgroundSize="9px 9px" /></Box>)}</Flex><Text fontSize="12px" fontWeight="800">{name}</Text><Text fontSize="10px" opacity=".6">{count}</Text></Box>
}

function Hand({ cards: hand, selected, onToggle }: { cards: Card[]; selected: string[]; onToggle: (id: string) => void }) {
  return <Flex justify="center" align="center" h="auto">
    {hand.map((card, index) => {
      const isSelected = selected.includes(card.id)
      return <Box key={card.id} as="button" onClick={() => onToggle(card.id)} aria-label={`${card.rank} of ${card.suit}`} position="relative" overflow="hidden" borderRadius="3px" flex="0 0 auto" w="5.3vw" aspectRatio="5 / 7" ml={index === 0 ? '0' : { base: '-2px', md: '-4px' }} transition="none">
        <CardFace card={card} />
        {isSelected && <Box position="absolute" inset="0" borderRadius="3px" bg="rgba(65, 84, 82, .55)" pointerEvents="none" />}
      </Box>
    })}
  </Flex>
}

function CardFace({ card, played = false, index = 0 }: { card: GameCard; played?: boolean; index?: number }) {
  const cardColor = card.suit === 'hearts' || card.suit === 'diamonds' ? 'coral' : 'ink'
  const symbol = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' }[card.suit]
  return <Box h="100%" w={played ? { base: '48px', md: '68px' } : '100%'} aspectRatio="5 / 7" ml={played && index > 0 ? { base: '-12px', md: '-17px' } : '0'} bg="#fffdf6" border="1px solid" borderColor="blackAlpha.500" borderRadius="3px" position="relative" overflow="hidden" boxShadow={played ? '0 7px 13px rgba(0,0,0,.25)' : undefined} zIndex={index}>
    <Text position="absolute" top={played ? '4px' : '.6vw'} left={played ? '5px' : '.6vw'} fontFamily="heading" fontSize={played ? { base: '16px', md: '23px' } : '1.65vw'} lineHeight=".9" color={cardColor}>{card.rank}</Text>
    <Text position="absolute" inset="0" display="flex" alignItems="center" justifyContent="center" pt={played ? '12px' : '1.2vw'} color={cardColor} fontSize={played ? { base: '27px', md: '38px' } : '3.2vw'} lineHeight="1">{symbol}</Text>
  </Box>
}

export default App
