import { ConnectionStatus } from '../transport/connection.js';

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  error: { code: string; message: string } | null;
  onDismissError: () => void;
}

const STATUS_TEXT: Partial<Record<ConnectionStatus, string>> = {
  connecting: 'Connecting to the server…',
  reconnecting: 'Reconnecting… your seat is being held.',
  offline: 'Connection lost. Retrying…',
};

/** Connection state and the most recent rejected action, if any. */
export function ConnectionBanner({ status, error, onDismissError }: ConnectionBannerProps) {
  const statusText = STATUS_TEXT[status];
  if (!statusText && !error) return null;

  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      {statusText && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {statusText}
        </p>
      )}
      {error && (
        <p className="flex items-start justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          <span>{error.message}</span>
          <button type="button" onClick={onDismissError} className="shrink-0 underline" aria-label="Dismiss error">
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}
