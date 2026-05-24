import { assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { Board } from "../../state/board.mts";

Deno.test("constructor test", () => {
  const boardInstance = new Board();
  const board = boardInstance.getBoard();
  board.forEach((col) => assertEquals(col, new Array(6).fill(null)));
});

Deno.test("insert empty", () => {
  const boardInstance = new Board();
  const board1 = boardInstance.getBoard();
  boardInstance.insertCoin("white", 5);
  const board2 = boardInstance.getBoard();
  assertNotEquals(board1, board2);
  assertEquals(board2[5][5], "white");
  const expected = [
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, "white"],
    [null, null, null, null, null, null],
  ];
  assertEquals(board2, expected);
});

Deno.test("insert more", () => {
  const boardInstance = new Board();
  boardInstance.insertCoin("white", 4);
  boardInstance.insertCoin("black", 4);
  boardInstance.insertCoin("white", 2);
  boardInstance.insertCoin("white", 5);
  boardInstance.insertCoin("black", 4);
  const board = boardInstance.getBoard();
  const expected = [
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, "white"],
    [null, null, null, null, null, null],
    [null, null, null, "black", "black", "white"],
    [null, null, null, null, null, "white"],
    [null, null, null, null, null, null],
  ];
  assertEquals(board, expected);
});

Deno.test("throws when overloading", () => {
  const b = new Board();
  for (let i = 0; i < 6; i++) {
    b.insertCoin("white", 1);
  }

  assertThrows(() => b.insertCoin("white", 1));
});

Deno.test("throws when not a valid col", () => {
  const b = new Board();
  assertThrows(() => b.insertCoin("black", 7));
  assertThrows(() => b.insertCoin("black", -1));
});

// ---------------------------------------------------------------------------
// isOver() — helpers
// ---------------------------------------------------------------------------

function makeBoard(
  moves: Array<{ color: "white" | "black"; col: number }>,
): Board {
  const board = new Board();
  for (const { color, col } of moves) board.insertCoin(color, col);
  return board;
}

// ---------------------------------------------------------------------------
// isOver() — no winner
// ---------------------------------------------------------------------------

Deno.test("isOver() returns null on an empty board", () => {
  assertEquals(new Board().isOver(), null);
});

Deno.test("isOver() returns null with fewer than 4 same-color coins", () => {
  const board = makeBoard([
    { color: "white", col: 0 },
    { color: "white", col: 1 },
    { color: "white", col: 2 },
  ]);
  assertEquals(board.isOver(), null);
});

Deno.test("isOver() returns null when 4 same-color coins have a gap (horizontal)", () => {
  // white at cols 0, 1, 3, 4 — broken by black at col 2
  const board = makeBoard([
    { color: "white", col: 0 },
    { color: "white", col: 1 },
    { color: "black", col: 2 },
    { color: "white", col: 3 },
    { color: "white", col: 4 },
  ]);
  assertEquals(board.isOver(), null);
});

Deno.test("isOver() returns null when 4 same-color coins have a gap (vertical)", () => {
  // col 0: white, black, white, white — no 4-in-a-row
  const board = makeBoard([
    { color: "white", col: 0 },
    { color: "black", col: 0 },
    { color: "white", col: 0 },
    { color: "white", col: 0 },
  ]);
  assertEquals(board.isOver(), null);
});

// ---------------------------------------------------------------------------
// isOver() — horizontal wins
// ---------------------------------------------------------------------------

Deno.test("isOver() detects horizontal win for white (cols 0-3)", () => {
  const board = makeBoard([
    { color: "white", col: 0 },
    { color: "white", col: 1 },
    { color: "white", col: 2 },
    { color: "white", col: 3 },
  ]);
  assertEquals(board.isOver(), "white");
});

Deno.test("isOver() detects horizontal win for black (cols 3-6)", () => {
  const board = makeBoard([
    { color: "black", col: 3 },
    { color: "black", col: 4 },
    { color: "black", col: 5 },
    { color: "black", col: 6 },
  ]);
  assertEquals(board.isOver(), "black");
});

Deno.test("isOver() detects horizontal win in the middle (cols 1-4)", () => {
  const board = makeBoard([
    { color: "white", col: 1 },
    { color: "white", col: 2 },
    { color: "white", col: 3 },
    { color: "white", col: 4 },
  ]);
  assertEquals(board.isOver(), "white");
});

Deno.test("isOver() detects horizontal win at the top row", () => {
  // Fill bottom 5 rows with alternating colors, then white on top in cols 0-3
  const board = new Board();
  for (let col = 0; col < 4; col++) {
    for (
      const color of (["black", "white", "black", "white", "black"] as const)
    ) {
      board.insertCoin(color, col);
    }
    board.insertCoin("white", col); // 6th coin — top of column
  }
  assertEquals(board.isOver(), "white");
});

// ---------------------------------------------------------------------------
// isOver() — vertical wins
// ---------------------------------------------------------------------------

Deno.test("isOver() detects vertical win for white (4 stacked in col 0)", () => {
  const board = makeBoard([
    { color: "white", col: 0 },
    { color: "white", col: 0 },
    { color: "white", col: 0 },
    { color: "white", col: 0 },
  ]);
  assertEquals(board.isOver(), "white");
});

Deno.test("isOver() detects vertical win for black (4 stacked in col 6)", () => {
  const board = makeBoard([
    { color: "black", col: 6 },
    { color: "black", col: 6 },
    { color: "black", col: 6 },
    { color: "black", col: 6 },
  ]);
  assertEquals(board.isOver(), "black");
});

Deno.test("isOver() detects vertical win at the top of a column", () => {
  // bottom 2: black, then 4 white stacked on top
  const board = makeBoard([
    { color: "black", col: 2 },
    { color: "black", col: 2 },
    { color: "white", col: 2 },
    { color: "white", col: 2 },
    { color: "white", col: 2 },
    { color: "white", col: 2 },
  ]);
  assertEquals(board.isOver(), "white");
});

// ---------------------------------------------------------------------------
// isOver() — diagonal wins (↘)
// ---------------------------------------------------------------------------

Deno.test("isOver() detects diagonal win for white (↘ starting at col 0)", () => {
  // col k gets k filler coins (black) then one white → staircase ↘
  const board = new Board();
  for (let col = 0; col < 4; col++) {
    for (let f = 0; f < col; f++) board.insertCoin("black", col);
    board.insertCoin("white", col);
  }
  assertEquals(board.isOver(), "white");
});

Deno.test("isOver() detects diagonal win for black (↘ starting at col 3)", () => {
  const board = new Board();
  for (let col = 3; col < 7; col++) {
    const filler = col - 3;
    for (let f = 0; f < filler; f++) board.insertCoin("white", col);
    board.insertCoin("black", col);
  }
  assertEquals(board.isOver(), "black");
});

// ---------------------------------------------------------------------------
// isOver() — diagonal wins (↗)
// ---------------------------------------------------------------------------

Deno.test("isOver() detects diagonal win for white (↗ from col 0)", () => {
  // col k gets (3-k) fillers then one white → ascending diagonal
  const board = new Board();
  for (let col = 0; col < 4; col++) {
    const filler = 3 - col;
    for (let f = 0; f < filler; f++) board.insertCoin("black", col);
    board.insertCoin("white", col);
  }
  assertEquals(board.isOver(), "white");
});

Deno.test("isOver() detects diagonal win for black (↗ from col 3)", () => {
  const board = new Board();
  for (let col = 3; col < 7; col++) {
    const filler = 6 - col;
    for (let f = 0; f < filler; f++) board.insertCoin("white", col);
    board.insertCoin("black", col);
  }
  assertEquals(board.isOver(), "black");
});
