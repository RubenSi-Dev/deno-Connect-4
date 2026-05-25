export type color = "white" | "black" | "blue" | "red" | "green" | "yellow";
export type square = color | null;
export const colors: color[] = [
  "white",
  "black",
  "blue",
  "red",
  "green",
  "yellow",
];
export type moveData = {
  player: color;
  move: number;
  col: number;
  wins: boolean;
};
