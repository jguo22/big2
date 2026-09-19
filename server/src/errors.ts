import { ErrorCode } from '@bigtwo/rules';

/** An action the server refused, carrying a code the client can branch on. */
export class ActionError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ActionError';
  }
}
