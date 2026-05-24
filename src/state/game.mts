import { BoardBase, type square } from "./board.mts";
import { getBoardString } from "../utils/render.mts";

export type moveData = {
  player: "white" | "black";
  move: number;
  col: number;
  wins: boolean;
};

export interface GameInterface {
  // returns which player's move it is
  getPlayerToMove(): "white" | "black";

  // return true if the player wins, false if not
  insertCoin(player: "white" | "black", col: number): boolean;

  // returns a list of all the moves made up to now
  getHistory(): moveData[];

  // returns a prettyprint board
  getBoardString(): string;

  // returns the board as array
  getBoard(): square[][];

  // returns whether the game was won
  isOver(): "white" | "black" | "stalemate" | null;
}

export class Game implements GameInterface {
  private board: BoardBase;
  private playerToMove: "white" | "black" = "white";
  private history: moveData[] = [];
  private moveCount: number = 0;

  constructor(board: BoardBase, playerToStart: "white" | "black" = "white") {
    this.board = board;
    this.playerToMove = playerToStart;
  }

  private switchTurn(): void {
    this.playerToMove = this.playerToMove === "white" ? "black" : "white";
  }

  public getBoard(): square[][] {
    return this.board.getBoard();
  }

  public getBoardString(): string {
    return getBoardString(
      this.getBoard(),
      `Turn: ${this.moveCount}          Move: ${this.playerToMove}`,
    );
  }

  public getPlayerToMove(): "white" | "black" {
    return this.playerToMove;
  }

  public insertCoin(player: "white" | "black", col: number): boolean {
    if (this.playerToMove !== player) throw new Error("Its not your turn");
    if (this.isOver() !== null) throw new Error("Game is over");
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

  public isOver(): "white" | "black" | "stalemate" | null {
    return this.board.isOver();
  }
}
