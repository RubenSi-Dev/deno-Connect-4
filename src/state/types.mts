/** A valid player/disc color used on the board. */
export type color = "white" | "black" | "blue" | "red" | "green" | "yellow";

/** The content of a single board square — either a player color or empty (`null`). */
export type square = color | null;

/** All available player colors, ordered by assignment priority. */
export const colors: color[] = [
  "white",
  "black",
  "blue",
  "red",
  "green",
  "yellow",
];

/**
 * Describes a single move made during the game.
 * Stored in the game history after each {@link insertCoin} call.
 */
export type moveData = {
  /** The color of the player who made the move. */
  player: color;
  /** The sequential move number (0-indexed). */
  move: number;
  /** The column index the coin was dropped into. */
  col: number;
  /** Whether this move resulted in a win for the player. */
  wins: boolean;
};
