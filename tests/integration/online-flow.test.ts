import { ClientMessage, RoomView, ServerMessage } from '@bigtwo/rules';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let stateDir: string;
let server: { port: number; close: () => Promise<void> };

beforeAll(async () => {
  stateDir = await mkdtemp(join(tmpdir(), 'bigtwo-test-'));
  process.env.BIGTWO_STATE_PATH = join(stateDir, 'state.json');
  const { start } = await import('../../server/src/index.js');
  server = await start(0);
});

afterAll(async () => {
  await server?.close();
  await rm(stateDir, { recursive: true, force: true });
});

/** A connected test client that records every server message it receives. */
class TestClient {
  readonly received: ServerMessage[] = [];
  playerId = '';
  private constructor(private readonly socket: WebSocket) {}

  /** Connects, sends `hello`, and resolves once the server has issued a session. */
  static async connect(port: number, name: string): Promise<TestClient> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const client = new TestClient(socket);
    socket.on('message', (raw) => client.received.push(JSON.parse(raw.toString()) as ServerMessage));
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    client.send({ type: 'hello', requestId: 'hello-1', sessionId: null, name });
    const welcome = await client.waitFor((message) => message.type === 'welcome');
    client.playerId = (welcome as Extract<ServerMessage, { type: 'welcome' }>).playerId;
    return client;
  }

  send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Waits for the first message matching `predicate`, including ones already
   * received, and returns it.
   *
   * Raises: `Error` after 2 seconds with no match.
   */
  async waitFor(predicate: (message: ServerMessage) => boolean, timeoutMs = 2000): Promise<ServerMessage> {
    const existing = this.received.find(predicate);
    if (existing) return existing;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for message')), timeoutMs);
      const onMessage = (raw: Buffer) => {
        const message = JSON.parse(raw.toString()) as ServerMessage;
        if (!predicate(message)) return;
        clearTimeout(timer);
        this.socket.off('message', onMessage);
        resolve(message);
      };
      this.socket.on('message', onMessage);
    });
  }

  /** Waits for the next room broadcast satisfying `predicate` and returns the room. */
  async waitForRoom(predicate: (room: RoomView) => boolean): Promise<RoomView> {
    const message = await this.waitFor((m) => m.type === 'room' && predicate(m.room));
    return (message as Extract<ServerMessage, { type: 'room' }>).room;
  }

  close(): void {
    this.socket.close();
  }
}

describe('online room flow', () => {
  it('runs create, join, ready, start and a first play across two clients', async () => {
    const host = await TestClient.connect(server.port, 'Host');
    const guest = await TestClient.connect(server.port, 'Guest');

    host.send({ type: 'create_room', requestId: 'c1' });
    const created = await host.waitForRoom(() => true);
    expect(created.players).toHaveLength(1);
    expect(created.hostId).toBe(host.playerId);

    guest.send({ type: 'join_room', requestId: 'j1', code: created.code });
    const joined = await guest.waitForRoom((room) => room.players.length === 2);
    expect(joined.code).toBe(created.code);

    // The host is told about the new player without asking.
    await host.waitForRoom((room) => room.players.length === 2);

    guest.send({ type: 'set_ready', requestId: 'r1', ready: true });
    await host.waitForRoom(
      (room) => room.players.length === 2 && room.players.every((player) => player.ready),
    );

    host.send({ type: 'start_match', requestId: 's1' });
    const playing = await host.waitForRoom((room) => room.phase === 'playing');
    expect(playing.match).not.toBeNull();
    expect(playing.match!.yourHand).toHaveLength(26);

    const guestPlaying = await guest.waitForRoom((room) => room.phase === 'playing');

    // Neither player can see the other's cards.
    const hostIds = new Set(playing.match!.yourHand.map((card) => card.id));
    for (const card of guestPlaying.match!.yourHand) expect(hostIds.has(card.id)).toBe(false);

    // Whoever holds the starting card opens with it.
    const starterIsHost = playing.match!.turnSeat === playing.players.find((p) => p.id === host.playerId)!.seat;
    const starter = starterIsHost ? host : guest;
    const starterRoom = starterIsHost ? playing : guestPlaying;
    const startingCardId = starterRoom.match!.startingCardId!;

    starter.send({ type: 'play', requestId: 'p1', cardIds: [startingCardId] });
    const afterPlay = await starter.waitForRoom((room) => room.match?.currentPlay !== null);
    expect(afterPlay.match!.currentPlay!.cards[0].id).toBe(startingCardId);
    expect(afterPlay.match!.yourHand).toHaveLength(25);

    host.close();
    guest.close();
  });

  it('rejects an illegal play and keeps the match intact', async () => {
    const host = await TestClient.connect(server.port, 'Host2');
    const guest = await TestClient.connect(server.port, 'Guest2');

    host.send({ type: 'create_room', requestId: 'c2' });
    const room = await host.waitForRoom(() => true);
    guest.send({ type: 'join_room', requestId: 'j2', code: room.code });
    await guest.waitForRoom((view) => view.players.length === 2);
    guest.send({ type: 'set_ready', requestId: 'r2', ready: true });
    await host.waitForRoom(
      (view) => view.players.length === 2 && view.players.every((player) => player.ready),
    );
    host.send({ type: 'start_match', requestId: 's2' });

    const playing = await host.waitForRoom((view) => view.phase === 'playing');
    const hostSeat = playing.players.find((player) => player.id === host.playerId)!.seat;
    const offTurn = playing.match!.turnSeat === hostSeat ? guest : host;

    offTurn.send({ type: 'play', requestId: 'bad1', cardIds: ['3D'] });
    const error = await offTurn.waitFor((message) => message.type === 'error');
    expect((error as Extract<ServerMessage, { type: 'error' }>).code).toMatch(/^rule:/);

    host.close();
    guest.close();
  });

  it('replays a cached reply for a repeated request id instead of acting twice', async () => {
    const client = await TestClient.connect(server.port, 'Repeater');
    client.send({ type: 'create_room', requestId: 'dup' });
    const first = await client.waitForRoom(() => true);

    // Only messages arriving after this point count, or the assertion would be
    // satisfied by the original reply and prove nothing.
    const before = client.received.length;
    client.send({ type: 'create_room', requestId: 'dup' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const replayed = client.received
      .slice(before)
      .filter((message): message is Extract<ServerMessage, { type: 'room' }> => message.type === 'room');
    expect(replayed).toHaveLength(1);
    expect(replayed[0].room.code).toBe(first.code);

    client.close();
  });

  it('rejects an unknown room code', async () => {
    const client = await TestClient.connect(server.port, 'Lost');
    client.send({ type: 'join_room', requestId: 'j9', code: 'ZZZZ' });
    const error = await client.waitFor((message) => message.type === 'error');
    expect((error as Extract<ServerMessage, { type: 'error' }>).code).toBe('room_not_found');
    client.close();
  });

  it('holds a seat across a reconnect', async () => {
    const socketName = 'Returner';
    const client = await TestClient.connect(server.port, socketName);
    client.send({ type: 'create_room', requestId: 'c3' });
    const room = await client.waitForRoom(() => true);
    client.close();

    // A fresh socket with the same session id reclaims the same seat.
    const sessionMessage = client.received.find(
      (message): message is Extract<ServerMessage, { type: 'welcome' }> => message.type === 'welcome',
    )!;
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}`);
    await new Promise<void>((resolve) => socket.once('open', () => resolve()));
    const messages: ServerMessage[] = [];
    socket.on('message', (raw) => messages.push(JSON.parse(raw.toString()) as ServerMessage));
    socket.send(
      JSON.stringify({
        type: 'hello',
        requestId: 'hello-2',
        sessionId: sessionMessage.sessionId,
        name: socketName,
      } satisfies ClientMessage),
    );

    await new Promise((resolve) => setTimeout(resolve, 300));
    const restored = messages.find(
      (message): message is Extract<ServerMessage, { type: 'room' }> => message.type === 'room',
    );
    expect(restored?.room.code).toBe(room.code);
    expect(restored?.room.players[0].connected).toBe(true);
    socket.close();
  });
});
