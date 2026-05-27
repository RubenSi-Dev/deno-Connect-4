import type { color, square } from "./types.mts";
import { GameError } from "../utils/game-error.mts";

/**
 * Abstract base class that defines the contract for a Connect Four board.
 * Concrete implementations must provide board retrieval, coin insertion,
 * and win/stalemate detection.
 */
export abstract class BoardBase {
  /**
   * @param _init - Initialisation token passed by the subclass constructor.
   */
  protected constructor(_init: string) {}

  /**
   * Returns the current board state as a 2-D column-major array.
   * `board[col][row]`, where `row 0` is the topmost cell.
   *
   * @returns A 2-D array of {@link square} values representing the board.
   */
  abstract getBoard(): square[][];

  /**
   * Drops a disc of the given color into the specified column.
   *
   * @param color - The color of the player placing the coin.
   * @param Column - The 0-indexed column to insert the coin into.
   * @throws {@link GameError} with code `INVALID_MOVE` if the column is out of
   *   bounds or already full.
   */
  abstract insertCoin(color: color, Column: number): void;

  /**
   * Checks whether the game has ended.
   *
   * @returns The winning {@link color} if a player has four in a row,
   *   `"stalemate"` if the board is full with no winner, or `undefined` if the
   *   game is still ongoing.
   */
  abstract isOver(): color | "stalemate" | undefined;
}

/**
 * Concrete Connect Four board backed by a column-major 2-D array.
 * Gravity is simulated by filling cells from the bottom of each column upward.
 */
export class Board extends BoardBase {
  // initializes all null
  private board: square[][];

  /**
   * Creates a new empty board with the given dimensions.
   *
   * @param init - Must be `"empty"` to initialise a blank board.
   * @param rows - Number of rows (default: 6).
   * @param cols - Number of columns (default: 7).
   * @throws {@link GameError} with code `INVALID_REQUEST` if `init` is not `"empty"`.
   */
  constructor(init: "empty" = "empty", rows: number = 6, cols: number = 7) {
    super(init);
    if (init === "empty") {
      this.board = Array.from(
        { length: cols },
        () => new Array(rows).fill(null),
      );
    } else throw new GameError("INVALID_REQUEST", "invalid setup");
  }

  /**
   * Checks whether the game has ended by scanning all possible winning lines
   * (horizontal, vertical, and both diagonals) and detecting a full board.
   *
   * @returns The winning {@link color} if a four-in-a-row exists,
   *   `"stalemate"` if all cells are occupied with no winner, or `undefined`
   *   if the game is still in progress.
   */
  isOver(): color | "stalemate" | undefined {
    if (!this.board.map((sqs) => !sqs.includes(null)).includes(false)) {
      return "stalemate";
    }
    const COLS = this.board.length;
    const ROWS = this.board[0].length;

    // Returns the winner if the 4 cells starting at (col, row) stepping by
    // (dc, dr) all share the same non-null color, otherwise null.
    /**
     * Checks whether the four cells starting at `(col, row)` and stepping
     * by `(dc, dr)` all contain the same non-null color.
     *
     * @param col - Starting column index.
     * @param row - Starting row index.
     * @param dc - Column step per iteration (−1, 0, or 1).
     * @param dr - Row step per iteration (−1, 0, or 1).
     * @returns The shared {@link color} if all four cells match, or `null`.
     */
    const checkLine = (
      col: number,
      row: number,
      dc: number,
      dr: number,
    ): square => {
      const color = this.board[col][row];
      if (color === null) return null;
      for (let i = 1; i < 4; i++) {
        if (this.board[col + dc * i][row + dr * i] !== color) return null;
      }
      return color;
    };

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        // Horizontal: →
        if (col + 3 < COLS) {
          const winner = checkLine(col, row, 1, 0);
          if (winner) return winner;
        }
        // Vertical: ↓
        if (row + 3 < ROWS) {
          const winner = checkLine(col, row, 0, 1);
          if (winner) return winner;
        }
        // Diagonal: ↘
        if (col + 3 < COLS && row + 3 < ROWS) {
          const winner = checkLine(col, row, 1, 1);
          if (winner) return winner;
        }
        // Diagonal: ↗
        if (col + 3 < COLS && row - 3 >= 0) {
          const winner = checkLine(col, row, 1, -1);
          if (winner) return winner;
        }
      }
    }

    return undefined;
  }

  /**
   * Returns a deep copy of the current board state so that callers cannot
   * mutate internal state.
   *
   * @returns A column-major 2-D array of {@link square} values.
   */
  public getBoard(): square[][] {
    const result: square[][] = [];
    this.board.forEach((col) => result.push(Array.from(col)));
    return result;
  }

  /**
   * Drops a disc of the given color into the specified column, settling it on
   * top of any existing discs (gravity simulation).
   *
   * @param color - The color of the player placing the coin.
   * @param column - The 0-indexed column to insert the coin into.
   * @throws {@link GameError} with code `INVALID_MOVE` if `column` is out of
   *   bounds or the column is already full.
   */
  public insertCoin(color: color, column: number): void {
    if (column < 0 || column >= this.board.length) {
      throw new GameError("INVALID_MOVE", "not a valid column");
    }
    const row = this.board[column];
    let insertIndex = row.findIndex((r) => r !== null) - 1;
    if (insertIndex === -1) {
      throw new GameError("INVALID_MOVE", "row already full");
    }
    if (insertIndex === -2) insertIndex = row.length - 1;
    row[insertIndex] = color;
    this.board[column] = row;
  }
}
