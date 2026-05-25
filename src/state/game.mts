import { BoardBase } from "./board.mts";
import { color, colors, moveData, square } from "./types.mts";
import { getBoardString } from "../utils/render.mts";

export interface GameInterface {
  // returns which player's move it is
  getPlayerToMove(): color;

  // returns index in player array of player to move
  getPlayerToMoveIndex(): number;

  // return true if the player wins, false if not
  insertCoin(player: color, col: number): boolean;

  // returns a list of all the moves made up to now
  getHistory(): moveData[];

  // returns a prettyprint board
  getBoardString(): string;

  // returns the board as array
  getBoard(): square[][];

  // returns whether the game was won
  isOver(): color | "stalemate" | undefined;

  // returns all the players
  getPlayers(): color[];
}

export class Game implements GameInterface {
  private board: BoardBase;
  private players: color[];
  private playerToMoveIdx: number = 0;
  private history: moveData[] = [];
  private moveCount: number = 0;

  constructor(
    board: BoardBase,
    playerCount: number = 2,
    playerToStart: color = "white",
  ) {
    if (playerCount < 2) throw new Error("More than 2 players are required");
    if (playerCount > colors.length) throw new Error("Choose less players");
    this.players = colors.slice(0, playerCount);

    this.board = board;
    if (!this.players.includes(playerToStart)) {
      throw new Error("player not available");
    }
    this.playerToMoveIdx = this.players.findIndex((p) => p === playerToStart);
  }
  public getPlayers(): color[] {
    return Array.from(this.players);
  }

  public getPlayerToMoveIndex(): number {
    return this.playerToMoveIdx;
  }

  public getPlayerToMove(): color {
    return this.players[this.playerToMoveIdx];
  }

  private switchTurn(): void {
    this.playerToMoveIdx = this.playerToMoveIdx + 1 >= this.players.length
      ? 0
      : this.playerToMoveIdx + 1;
  }

  public getBoard(): square[][] {
    return this.board.getBoard();
  }

  public getBoardString(): string {
    return getBoardString(
      this.getBoard(),
      `Turn: ${this.moveCount}          Move: ${this.getPlayerToMove()}`,
    );
  }

  public insertCoin(player: color, col: number): boolean {
    if (this.getPlayerToMove() !== player) throw new Error("Its not your turn");
    if (this.isOver()) throw new Error("Game is over");
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

  public getHistory(): moveData[] {
    return this.history;
  }

  public isOver(): color | "stalemate" | undefined {
    return this.board.isOver() ?? undefined;
  }
}
