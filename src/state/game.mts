import { BoardBase } from "./board.mts";
import { color, colors, moveData, square } from "./types.mts";
import { GameError } from "../utils/game-error.mts";

/**
 * Public interface that every Connect Four game implementation must satisfy.
 * Abstracts board access, turn management, move insertion, and game-over
 * detection so that consumers do not depend on a concrete class.
 */
export interface GameInterface {
  /**
   * Returns the color of the player whose turn it currently is.
   *
   * @returns The current player's {@link color}.
   */
  getPlayerToMove(): color;

  /**
   * Returns the 0-based index of the current player within the internal
   * players array.
   *
   * @returns The current player's index.
   */
  getPlayerToMoveIndex(): number;

  /**
   * Attempts to place a coin for `player` in column `col`.
   *
   * @param player - The color of the player making the move.
   * @param col - The 0-indexed column to drop the coin into.
   * @returns `true` if the move ends the game (win or stalemate), `false`
   *   otherwise.
   * @throws {@link GameError} if it is not this player's turn, the game is
   *   already over, or the move is otherwise invalid.
   */
  insertCoin(player: color, col: number): boolean;

  /**
   * Returns the complete, ordered list of moves made since the game started.
   *
   * @returns An array of {@link moveData} objects, one per move.
   */
  getHistory(): moveData[];

  /**
   * Returns a human-readable, ANSI-styled string representation of the current
   * board state suitable for printing to a terminal.
   *
   * @returns A multi-line board string.
   */
  //getBoardString(): string;

  /**
   * Returns the current board state as a column-major 2-D array.
   * `board[col][row]`, where `row 0` is the topmost cell.
   *
   * @returns A 2-D array of {@link square} values.
   */
  getBoard(): square[][];

  /**
   * Checks whether the game has ended.
   *
   * @returns The winning {@link color}, `"stalemate"`, or `undefined` if the
   *   game is still in progress.
   */
  isOver(): color | "stalemate" | undefined;

  /**
   * Returns an ordered copy of the player list.
   * The index of each color corresponds to that player's turn order.
   *
   * @returns An array of player {@link color} values.
   */
  getPlayers(): (color | null)[];

  removePlayerByIndex(index: number): void;

  removePlayerByColor(color: color): void;
}

/**
 * Core Connect Four game controller.
 * Wraps a {@link BoardBase} instance and enforces turn order, move validation,
 * history tracking, and win detection.
 */
export class Game implements GameInterface {
  private board: BoardBase;
  private players: (color | null)[];
  private playerToMoveIdx: number = 0;
  private history: moveData[] = [];
  private moveCount: number = 0;

  /**
   * Creates a new game with the specified board, player count, and starting
   * player.
   *
   * @param board - The board implementation to use (e.g. {@link Board}).
   * @param playerCount - Number of players (default: 2, minimum: 2, maximum: 6).
   * @param playerToStart - The color that takes the first turn (default: `"white"`).
   * @throws {@link GameError} with code `GAME_CANT_START` if `playerCount` is
   *   less than 2 or exceeds the number of available colors.
   * @throws {@link GameError} with code `INVALID_REQUEST` if `playerToStart`
   *   is not among the assigned player colors.
   */
  constructor(
    board: BoardBase,
    playerCount: number = 2,
    playerToStart: color = "white",
  ) {
    if (playerCount < 2) {
      throw new GameError(
        "GAME_CANT_START",
        "More than 2 players are required",
      );
    }
    if (playerCount > colors.length) {
      throw new GameError(
        "GAME_CANT_START",
        `More than 7 players is not supported`,
      );
    }
    this.players = colors.slice(0, playerCount);

    this.board = board;
    if (!this.players.includes(playerToStart)) {
      throw new GameError(
        "INVALID_REQUEST",
        "starter color not available as player",
      );
    }
    this.playerToMoveIdx = this.players.findIndex((p) => p === playerToStart);
  }

  removePlayerByIndex(index: number): void {
    this.players[index] = null;
  }

  removePlayerByColor(color: color): void {
    this.removePlayerByIndex(this.players.findIndex((p) => p === color));
  }

  /**
   * Returns an ordered copy of the player list.
   *
   * @returns An array of player {@link color} values.
   */
  public getPlayers(): (color | null)[] {
    return Array.from(this.players);
  }

  /**
   * Returns the 0-based index of the current player within the players array.
   *
   * @returns The current player index.
   */
  public getPlayerToMoveIndex(): number {
    return this.playerToMoveIdx;
  }

  /**
   * Returns the color of the player whose turn it currently is.
   *
   * @returns The current player's {@link color}.
   */
  public getPlayerToMove(): color {
    const result = this.players[this.playerToMoveIdx];
    if (!result) {
      throw new GameError("INTERNAL_ERROR", "Player not available");
    }
    return result;
  }

  /**
   * Advances the turn to the next player, wrapping around from the last
   * player back to index 0.
   */
  private switchTurn(): void {
    const result = this.playerToMoveIdx + 1 >= this.players.length
      ? 0
      : this.playerToMoveIdx + 1;

    if (!this.players[result]) {
      this.switchTurn();
    } else {
      this.playerToMoveIdx = result;
    }
  }

  /**
   * Returns the current board state as a column-major 2-D array.
   *
   * @returns A 2-D array of {@link square} values.
   */
  public getBoard(): square[][] {
    return this.board.getBoard();
  }

  /**
   * Returns an ANSI-styled, multi-line string representation of the board
   * including the current turn number and the color to move.
   *
   * @returns A formatted board string ready to print.
   */
  //public getBoardString(): string {
  //  return getBoardString(
  //    this.getBoard(),
  //    `Turn: ${this.moveCount}          Move: ${this.getPlayerToMove()}`,
  //  );
  //}

  /**
   * Places a coin for the given player in the specified column, records the
   * move in history, and advances the turn if the game continues.
   *
   * @param player - The color of the player making the move.
   * @param col - The 0-indexed column to drop the coin into.
   * @returns `true` if the move ends the game (win or stalemate), `false` if
   *   the game continues.
   * @throws {@link GameError} with code `INVALID_REQUEST` if it is not this
   *   player's turn.
   * @throws {@link GameError} with code `GAME_OVER` if the game has already ended.
   * @throws {@link GameError} with code `INVALID_MOVE` for board-level errors
   *   (column out of bounds or full).
   */
  public insertCoin(player: color, col: number): boolean {
    if (this.getPlayerToMove() !== player) {
      throw new GameError("INVALID_REQUEST", "Its not your turn");
    }
    if (this.isOver()) throw new GameError("GAME_OVER", "Game is over");
    this.board.insertCoin(player, col);

    const win = this.board.isOver();
    const historyItem: moveData = {
      player: player,
      move: this.moveCount,
      col: col,
      wins: win === player,
    };
    this.history = [...this.history, historyItem];

    if (win) return true;
    this.moveCount++;
    this.switchTurn();
    return false;
  }

  /**
   * Returns the complete, ordered list of moves made since the game started.
   *
   * @returns An array of {@link moveData} objects.
   */
  public getHistory(): moveData[] {
    return this.history;
  }

  /**
   * Delegates to the underlying board to determine whether the game has ended.
   *
   * @returns The winning {@link color}, `"stalemate"`, or `undefined` if the
   *   game is still in progress.
   */
  public isOver(): color | "stalemate" | undefined {
    return this.board.isOver() ?? undefined;
  }
}
