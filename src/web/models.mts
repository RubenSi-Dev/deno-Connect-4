import { color, moveData, square } from "../state/types.mts";

export type ClientRequest = {
  type: "insertCoin" | "getHistory" | "getColor" | "getContext" | "startGame";
  requestId?: string; // echoed back in the response for async matching
  [keys: string]: string | number | undefined;
};

export type ServerResponseOld = {
  requestId?: string;
  toMove?: color;
  winner?: color | "stalemate";
  color?: color;
  data?: square[][] | moveData[];
  error?: string;
};

export type GameSettings = {
  columns: number;
  rows: number;
  numberOfPlayers: number;
};

export class GameError extends Error {
  gameErrorCode: ErrorCode;
  constructor(errorCode: ErrorCode, message: string) {
    super(message);
    this.gameErrorCode = errorCode;
  }
}

type ErrorCode =
  | "INVALID_MOVE"
  | "GAME_NOT_STARTED"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR"
  | "GAME_CANT_START"
  | "GAME_OVER"
  | "INVALID_REQ_ID"
  | "UNKNOWN";

export type ServerResponse =
  | ServerResponseContextUpdate
  | ServerResponseHistory
  | ServerResponseGameOver
  | ServerResponseGameStarted
  | ServerResponseStateUpdate
  | ServerResponsePlayerJoined
  | ServerResponsePlayerLeft
  | ServerResponseError;

interface ServerResponseBase {
  requestId?: string;
  type:
    | "CONTEXT_UPDATE"
    | "HISTORY"
    | "GAME_OVER"
    | "GAME_STARTED"
    | "STATE_UPDATE"
    | "PLAYER_JOINED"
    | "PLAYER_LEFT"
    | "ERROR";
  payload?: unknown;
}

interface ServerResponseError extends ServerResponseBase {
  type: "ERROR";
  payload: {
    code: ErrorCode;
    explanation: string;
  };
}

interface ServerResponseContextUpdate extends ServerResponseBase {
  type: "CONTEXT_UPDATE";
  payload: {
    yourColor: color;
    toMove: color;
    playerCount: number;
    moveCount: number;
  };
}

interface ServerResponseHistory extends ServerResponseBase {
  type: "HISTORY";
  payload: {
    data: moveData[];
  };
}

interface ServerResponseGameOver extends ServerResponseBase {
  type: "GAME_OVER";
  payload: {
    reason: "player_won" | "stalemate" | "disconnected";
    information: color | undefined;
  };
}

interface ServerResponseGameStarted extends ServerResponseBase {
  type: "GAME_STARTED";
  payload: {
    toMove: color;
    board: square[][];
  };
}

interface ServerResponseStateUpdate extends ServerResponseBase {
  type: "STATE_UPDATE";
  payload: {
    toMove: color;
    board: square[][];
  };
}

interface ServerResponsePlayerJoined extends ServerResponseBase {
  type: "PLAYER_JOINED";
  payload: {
    playerCount: number;
  };
}

interface ServerResponsePlayerLeft extends ServerResponseBase {
  type: "PLAYER_LEFT";
  payload: {
    playerCount: number;
  };
}
