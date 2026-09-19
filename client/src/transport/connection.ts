import { ClientMessage, ServerMessage } from '@bigtwo/rules';

/** What the UI shows about the socket. */
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'offline';

/** `Omit` applied to each member of a union rather than to the union itself. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A client message with the `requestId` left for `GameConnection.send` to fill in. */
export type OutgoingMessage = DistributiveOmit<ClientMessage, 'requestId'>;

export interface ConnectionHandlers {
  onMessage(message: ServerMessage): void;
  onStatus(status: ConnectionStatus): void;
}

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;

/**
 * A reconnecting WebSocket client for the game server.
 *
 * The connection owns the session identity: on every (re)connect it sends
 * `hello` with the remembered session id, which is what lets a refresh or a
 * dropped connection reclaim the player's seat. Messages sent while the socket
 * is down are queued and flushed once `hello` has been sent again.
 */
export class GameConnection {
  private socket: WebSocket | null = null;
  private backoff = INITIAL_BACKOFF_MS;
  private retryTimer: number | null = null;
  private queue: ClientMessage[] = [];
  private closedByUs = false;
  private nextRequest = 0;

  /**
   * Params:
   *   url: the server's WebSocket URL.
   *   handlers: callbacks for server messages and status changes.
   *   sessionId: a previously issued session id, or `null` for a first visit.
   *   name: display name sent with `hello`.
   */
  constructor(
    private readonly url: string,
    private readonly handlers: ConnectionHandlers,
    private sessionId: string | null,
    private name: string,
  ) {}

  /** Opens the socket. Safe to call once; reconnects happen automatically. */
  connect(): void {
    this.closedByUs = false;
    this.open();
  }

  /**
   * Remembers the identity used by future `hello` messages. Call this after the
   * server issues a session id so a reconnect reclaims the same seat.
   */
  setIdentity(sessionId: string | null, name: string): void {
    this.sessionId = sessionId;
    this.name = name;
  }

  /**
   * Sends a message, assigning it a fresh request id.
   *
   * Params:
   *   message: any client message except its `requestId`.
   * Returns: the assigned request id. The same id is reused when the message
   *   has to be queued and flushed later, so the server can deduplicate it.
   */
  send(message: OutgoingMessage): string {
    const requestId = `r${++this.nextRequest}-${Math.random().toString(36).slice(2, 8)}`;
    const full = { ...message, requestId } as ClientMessage;
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(full));
    else this.queue.push(full);
    return requestId;
  }

  /** Closes the socket and stops reconnecting. */
  close(): void {
    this.closedByUs = true;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.socket?.close();
    this.socket = null;
  }

  private open(): void {
    this.handlers.onStatus(this.backoff === INITIAL_BACKOFF_MS ? 'connecting' : 'reconnecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      this.backoff = INITIAL_BACKOFF_MS;
      this.handlers.onStatus('open');
      socket.send(
        JSON.stringify({
          type: 'hello',
          requestId: `hello-${Date.now()}`,
          sessionId: this.sessionId,
          name: this.name,
        } satisfies ClientMessage),
      );
      const queued = this.queue;
      this.queue = [];
      for (const message of queued) socket.send(JSON.stringify(message));
    };

    socket.onmessage = (event) => {
      try {
        this.handlers.onMessage(JSON.parse(event.data as string) as ServerMessage);
      } catch {
        // A message we cannot parse is not actionable; drop it.
      }
    };

    socket.onclose = () => {
      this.socket = null;
      if (this.closedByUs) return;
      this.handlers.onStatus('offline');
      this.retryTimer = window.setTimeout(() => this.open(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    };

    socket.onerror = () => socket.close();
  }
}
