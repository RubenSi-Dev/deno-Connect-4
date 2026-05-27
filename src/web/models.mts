import { color, moveData, square } from "../state/types.mts";
import { ErrorCode } from "../utils/game-error.mts";

/**
 * A message sent from a WebSocket client to the server.
 * The `type` field determines which server action is triggered.
 * Additional fields (e.g. `row`) are action-specific and passed via the
 * index signature.
 */
export type ClientRequest = {
  /** The action the client wishes to perform. */
  type: "insertCoin" | "getHistory" | "getColor" | "getContext" | "startGame";
  /** Optional client-generated ID echoed back in the response for async request matching. */
  requestId?: string; // echoed back in the response for async matching
  [keys: string]: string | number | undefined;
};

/**
 * Legacy server response shape kept for backward compatibility with
 * `testclient.ts`. Prefer {@link ServerResponse} for new code.
 *
 * @deprecated Use {@link ServerResponse} instead.
 */
export type ServerResponseOld = {
  /** Echoed request ID for async matching. */
  requestId?: string;
  /** Color of the player whose turn it is. */
  toMove?: color;
  /** The winner color, or `"stalemate"`. */
  winner?: color | "stalemate";
  /** The color assigned to the requesting player. */
  color?: color;
  /** Generic data payload (board state or move history). */
  data?: square[][] | moveData[];
  /** Human-readable error description. */
  error?: string;
};

/**
 * Settings used to configure a new game board.
 */
export type GameSettings = {
  /** Number of columns in the board. */
  columns: number;
  /** Number of rows in the board. */
  rows: number;
  /** Total number of players participating. */
  numberOfPlayers: number;
};

/**
 * Discriminated union of all possible server-to-client WebSocket messages.
 * Use the `type` field to narrow to a specific response variant.
 */
export type ServerResponse =
  | ServerResponseContextUpdate
  | ServerResponseHistory
  | ServerResponseGameOver
  | ServerResponseGameStarted
  | ServerResponseStateUpdate
  | ServerResponsePlayerJoined
  | ServerResponsePlayerLeft
  | ServerResponseError;

/**
 * Base fields shared by every server response variant.
 */
interface ServerResponseBase {
  /** Echoed back from the originating {@link ClientRequest}, if present. */
  requestId?: string;
  /** Discriminant tag identifying the response type. */
  type:
    | "CONTEXT_UPDATE"
    | "HISTORY"
    | "GAME_OVER"
    | "GAME_STARTED"
    | "STATE_UPDATE"
    | "PLAYER_JOINED"
    | "PLAYER_LEFT"
    | "ERROR";
  /** Response-specific payload. Typed precisely in each sub-interface. */
  payload?: unknown;
}

/**
 * Sent when a request results in an error on the server.
 */
interface ServerResponseError extends ServerResponseBase {
  type: "ERROR";
  payload: {
    /** Machine-readable error code. */
    code: ErrorCode;
    /** Human-readable explanation of the error. */
    explanation: string;
  };
}

/**
 * Sent in response to a `"getContext"` request with the requesting player's
 * current game context.
 */
interface ServerResponseContextUpdate extends ServerResponseBase {
  type: "CONTEXT_UPDATE";
  payload: {
    /** The color assigned to the requesting player. */
    yourColor: color;
    /** The color of the player whose turn it currently is. */
    toMove: color;
    /** Total number of connected players. */
    playerCount: number;
    /** Number of moves completed so far. */
    moveCount: number;
  };
}

/**
 * Sent in response to a `"getHistory"` request containing the full move log.
 */
interface ServerResponseHistory extends ServerResponseBase {
  type: "HISTORY";
  payload: {
    /** Ordered array of all moves made since the game started. */
    data: moveData[];
  };
}

/**
 * Sent to all players when the game ends (win, stalemate, or disconnection).
 */
interface ServerResponseGameOver extends ServerResponseBase {
  type: "GAME_OVER";
  payload: {
    /** The reason the game ended. */
    reason: "player_won" | "stalemate" | "disconnected";
    /** The winning player's color, or `undefined` for stalemates/disconnections. */
    information: color | undefined;
  };
}

/**
 * Sent to all players immediately after the game is successfully started.
 * Contains the initial board state and the first player to move.
 */
interface ServerResponseGameStarted extends ServerResponseBase {
  type: "GAME_STARTED";
  payload: {
    /** The color of the player taking the first turn. */
    toMove: color;
    /** The initial board state (all nulls for a fresh game). */
    board: square[][];
  };
}

/**
 * Broadcast to all players after a successful coin insertion with the updated
 * board and the next player to move.
 */
interface ServerResponseStateUpdate extends ServerResponseBase {
  type: "STATE_UPDATE";
  payload: {
    /** The color of the player whose turn it is next. */
    toMove: color;
    /** The updated board state after the last move. */
    board: square[][];
  };
}

/**
 * Broadcast to all players when a new player joins the game lobby.
 */
interface ServerResponsePlayerJoined extends ServerResponseBase {
  type: "PLAYER_JOINED";
  payload: {
    /** Total number of connected players after the join. */
    playerCount: number;
  };
}

/**
 * Broadcast to all remaining players when a player disconnects.
 */
interface ServerResponsePlayerLeft extends ServerResponseBase {
  type: "PLAYER_LEFT";
  payload: {
    /** Total number of connected players after the disconnection. */
    playerCount: number;
  };
}
