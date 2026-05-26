import { color, moveData, square } from "../state/types.mts";

export type ClientRequest = {
  type: "insertCoin" | "getHistory" | "getColor" | "getContext" | "startGame";
  requestId?: string; // echoed back in the response for async matching
  [keys: string]: string | number | undefined;
};

export type ServerResponse = {
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
