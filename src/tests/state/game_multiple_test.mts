import { assertEquals } from "@std/assert";
import { Board } from "../../state/board.mts";
import { Game } from "../../state/game.mts";
import { colors } from "../../state/types.mts";
import { assertThrows } from "@std/assert/throws";

let board: Board;

Deno.test.beforeEach(() => {
  board = new Board();
});

Deno.test("Cycles through the list of players correctly", () => {
  const game = new Game(board, 6);
  assertEquals(game.getPlayerToMove(), colors[0]);
  game.insertCoin(game.getPlayerToMove(), 5);
  assertEquals(game.getPlayerToMove(), colors[1]);
  game.insertCoin(game.getPlayerToMove(), 4);
  assertEquals(game.getPlayerToMove(), colors[2]);
  game.insertCoin(game.getPlayerToMove(), 3);
  assertEquals(game.getPlayerToMove(), colors[3]);
  game.insertCoin(game.getPlayerToMove(), 2);
  assertEquals(game.getPlayerToMove(), colors[4]);
  game.insertCoin(game.getPlayerToMove(), 1);
  assertEquals(game.getPlayerToMove(), colors[5]);
  game.insertCoin(game.getPlayerToMove(), 0);
  assertEquals(game.getPlayerToMove(), colors[0]);
  game.insertCoin(game.getPlayerToMove(), 6);
  assertEquals(game.getPlayerToMove(), colors[1]);
});

Deno.test("Correctly detects when a player won", () => {
  const game = new Game(board, 3);
  game.insertCoin("white", 0);
  game.insertCoin("black", 1);
  game.insertCoin("blue", 2);
  game.insertCoin("white", 0);
  game.insertCoin("black", 1);
  game.insertCoin("blue", 2);
  game.insertCoin("white", 0);
  game.insertCoin("black", 1);
  game.insertCoin("blue", 2);
  const boardState1 = game.getBoard();
  const boardState2 = game.getBoard();
  game.insertCoin("white", 4);
  game.insertCoin("black", 5);
  game.insertCoin("blue", 2);
  assertEquals(game.isOver(), "blue");

  const board1 = new Board();
  board1["board"] = boardState1;
  const game1 = new Game(board1, 3);
  game1.insertCoin("white", 0);
  assertEquals(game1.isOver(), "white");

  const board2 = new Board();
  board2["board"] = boardState2;
  const game2 = new Game(board2, 3);
  game2.insertCoin("white", 4);
  game2.insertCoin("black", 1);
  assertEquals(game2.isOver(), "black");
});

Deno.test("throws when its not the players turn", () => {
  const game = new Game(board, 3);
  game.insertCoin("white", 0);
  assertThrows(() => game.insertCoin("white", 0));
  assertThrows(() => game.insertCoin("blue", 0));
  game.insertCoin("black", 0);
  assertThrows(() => game.insertCoin("black", 0));
  assertThrows(() => game.insertCoin("white", 0));
  game.insertCoin("blue", 0);
  assertThrows(() => game.insertCoin("blue", 0));
  assertThrows(() => game.insertCoin("black", 0));
});

Deno.test("get list of current players", () => {
  const game = new Game(board, 4);
  assertEquals(game.getPlayers(), colors.slice(0, 4));
  const game2 = new Game(board, 5);
  assertEquals(game2.getPlayers(), colors.slice(0, 5));
});

Deno.test("throws when asking to play with too many or too few players", () => {
  assertThrows(() => new Game(board, 1));
  assertThrows(() => new Game(board, 10));
});
