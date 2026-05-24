export type square = "white" | "black" | null;

export abstract class BoardBase {
  protected constructor(_init: string) {}
  abstract getBoard(): square[][];
  abstract insertCoin(color: "white" | "black", Column: number): void;
  abstract isOver(): "white" | "black" | "stalemate" | null;
}

export class Board extends BoardBase {
  // initializes all null
  private board: square[][];

  constructor(init: "empty" = "empty", rows: number = 6, cols: number = 7) {
    super(init);
    if (init === "empty") {
      this.board = Array.from(
        { length: cols },
        () => new Array(rows).fill(null),
      );
    } else throw new Error("invalid setup");
  }

  isOver(): "white" | "black" | "stalemate" | null {
    if (!this.board.map((sqs) => !sqs.includes(null)).includes(false)) {
      return "stalemate";
    }
    const COLS = this.board.length;
    const ROWS = this.board[0].length;

    // Returns the winner if the 4 cells starting at (col, row) stepping by
    // (dc, dr) all share the same non-null color, otherwise null.
    const checkLine = (
      col: number,
      row: number,
      dc: number,
      dr: number,
    ): "white" | "black" | null => {
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

    return null;
  }

  public getBoard(): square[][] {
    const result: square[][] = [];
    this.board.forEach((col) => result.push(Array.from(col)));
    return result;
  }

  public insertCoin(color: "white" | "black", column: number): void {
    if (column < 0 || column >= this.board.length) {
      throw new Error("not a valid column");
    }
    const row = this.board[column];
    let insertIndex = row.findIndex((r) => r !== null) - 1;
    if (insertIndex === -1) throw new Error("row already full");
    if (insertIndex === -2) insertIndex = row.length - 1;
    row[insertIndex] = color;
    this.board[column] = row;
  }
}
