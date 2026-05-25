import { color, moveData, square } from "../state/types.mts";

export type ClientRequest = {
  type: string;
  [keys: string]: string | number;
};

export type ServerResponse = {
  toMove: color;
  winner: color | "stalemate" | undefined;
  data: square[][] | moveData[];
};

export type GameSettings = {
  columns: number;
  rows: number;
  numberOfPlayers: number;
};
