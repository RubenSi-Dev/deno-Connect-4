/**
 * Typed error thrown by game and board logic to distinguish expected game-rule
 * violations from unexpected runtime errors.
 */
export class GameError extends Error {
  /** Machine-readable error code indicating the category of the failure. */
  gameErrorCode: ErrorCode;

  /**
   * @param errorCode - A machine-readable {@link ErrorCode} classifying the error.
   * @param message - A human-readable explanation of what went wrong.
   */
  constructor(errorCode: ErrorCode, message: string) {
    super(message);
    this.gameErrorCode = errorCode;
  }
}

/**
 * Machine-readable error codes used in {@link GameError} and {@link ServerResponseError}.
 *
 * - `INVALID_MOVE` – The requested move is not allowed (e.g. column full or out of bounds).
 * - `GAME_NOT_STARTED` – An action was attempted before the game was started.
 * - `INVALID_REQUEST` – The request is malformed or violates game rules.
 * - `INTERNAL_ERROR` – An unexpected server-side error occurred.
 * - `GAME_CANT_START` – The game cannot be started with the current configuration.
 * - `GAME_OVER` – An action was attempted after the game has already ended.
 * - `INVALID_REQ_ID` – The request ID is missing or malformed.
 * - `UNKNOWN` – An unclassified error occurred.
 */
export type ErrorCode =
  | "INVALID_MOVE"
  | "GAME_NOT_STARTED"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR"
  | "GAME_CANT_START"
  | "GAME_OVER"
  | "INVALID_REQ_ID"
  | "UNKNOWN";
