import { RoomSettings, RoomSummary, RoomView, ServerMessage } from '@bigtwo/rules';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionStatus, GameConnection } from '../transport/connection.js';

const SESSION_KEY = 'bigtwo.sessionId';
const NAME_KEY = 'bigtwo.name';

// In production the server serves this page too, so the socket lives at /ws on
// the same origin. In development Vite serves the page on its own port, so the
// socket has to be addressed on the server's.
const WS_URL: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  (import.meta.env.DEV
    ? `ws://${location.hostname}:8080/ws`
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

export interface ServerError {
  readonly code: string;
  readonly message: string;
}

export interface GameContextValue {
  readonly status: ConnectionStatus;
  readonly playerId: string | null;
  readonly name: string;
  readonly room: RoomView | null;
  /** Rooms shown in the browser. Pushed by the server whenever they change. */
  readonly rooms: readonly RoomSummary[];
  readonly error: ServerError | null;
  /** Creates a room; omitted settings take the server's defaults. */
  createRoom(name: string, password: string, settings?: Partial<RoomSettings>): void;
  joinRoom(code: string, password?: string): void;
  refreshRooms(): void;
  leaveRoom(): void;
  setName(name: string): void;
  setReady(ready: boolean): void;
  addBot(): void;
  removeBot(playerId: string): void;
  startMatch(): void;
  play(cardIds: string[]): void;
  pass(): void;
  newMatch(): void;
  dismissError(): void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Owns the socket and the server-authoritative room state.
 *
 * Nothing here decides game outcomes: every action is sent to the server and
 * the UI re-renders from whatever state the server broadcasts back.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setNameState] = useState(() => readStored(NAME_KEY) ?? '');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [rooms, setRooms] = useState<readonly RoomSummary[]>([]);
  const [error, setError] = useState<ServerError | null>(null);
  const connectionRef = useRef<GameConnection | null>(null);

  useEffect(() => {
    const connection = new GameConnection(
      WS_URL,
      {
        onStatus: setStatus,
        onMessage: (message: ServerMessage) => {
          switch (message.type) {
            case 'welcome':
              writeStored(SESSION_KEY, message.sessionId);
              writeStored(NAME_KEY, message.name);
              setPlayerId(message.playerId);
              setNameState(message.name);
              connection.setIdentity(message.sessionId, message.name);
              break;
            case 'room':
              setRoom(message.room);
              setError(null);
              break;
            case 'rooms':
              setRooms(message.rooms);
              break;
            case 'lobby':
              setRoom(null);
              break;
            case 'error':
              setError({ code: message.code, message: message.message });
              break;
            case 'pong':
              break;
          }
        },
      },
      readStored(SESSION_KEY),
      readStored(NAME_KEY) ?? '',
    );
    connectionRef.current = connection;
    connection.connect();
    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, []);

  const value = useMemo<GameContextValue>(() => {
    const send = (message: Parameters<GameConnection['send']>[0]) => {
      setError(null);
      connectionRef.current?.send(message);
    };
    return {
      status,
      playerId,
      name,
      room,
      rooms,
      error,
      createRoom: (roomName, password, settings) =>
        send({ type: 'create_room', name: roomName, password, settings }),
      joinRoom: (code, password) => send({ type: 'join_room', code, password }),
      refreshRooms: () => send({ type: 'list_rooms' }),
      leaveRoom: () => send({ type: 'leave_room' }),
      setName: (next) => {
        setNameState(next);
        writeStored(NAME_KEY, next);
        send({ type: 'set_name', name: next });
      },
      setReady: (ready) => send({ type: 'set_ready', ready }),
      addBot: () => send({ type: 'add_bot' }),
      removeBot: (playerId) => send({ type: 'remove_bot', playerId }),
      startMatch: () => send({ type: 'start_match' }),
      play: (cardIds) => send({ type: 'play', cardIds }),
      pass: () => send({ type: 'pass' }),
      newMatch: () => send({ type: 'new_match' }),
      dismissError: () => setError(null),
    };
  }, [status, playerId, name, room, rooms, error]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * Reads the game context.
 *
 * Returns: the live connection state and the action senders.
 * Raises: `Error` when called outside a `GameProvider`.
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used inside a GameProvider');
  return context;
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing and blocked storage are survivable: the player simply
    // cannot reclaim their seat after a refresh.
  }
}
