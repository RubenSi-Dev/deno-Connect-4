import { assertEquals, assertThrows } from "@std/assert";
import { Game } from "../../state/game.mts";
import { Board } from "../../state/board.mts";

let boardInstance: Board;
let game: Game;

Deno.test.beforeEach(() => {
  boardInstance = new Board();
  game = new Game(boardInstance);
});

Deno.test("sets up the game correctly", () => {
  assertEquals(game.getBoard(), boardInstance.getBoard());
  assertEquals(game.getPlayerToMove(), "white");
  assertEquals(game.getHistory().length, 0);
  assertEquals(game.isOver(), undefined);
});

Deno.test("Player moves are switching correctly", () => {
  game.insertCoin("white", 5);
  assertEquals(game.getPlayerToMove(), "black");
  game.insertCoin("black", 4);
  assertEquals(game.getPlayerToMove(), "white");
  game.insertCoin("white", 2);
  assertEquals(game.getPlayerToMove(), "black");
  game.insertCoin("black", 4);
  assertEquals(game.getPlayerToMove(), "white");
});

Deno.test("Player move throws when its not the players turn", () => {
  game.insertCoin("white", 5);
  assertEquals(game.getPlayerToMove(), "black");
  assertThrows(() => game.insertCoin("white", 5));
});

Deno.test("Whether the history is appended succesfully after each turn ", () => {
  assertEquals(game.getHistory(), []);
  game.insertCoin("white", 5);
  assertEquals(game.getHistory()[0], {
    player: "white",
    move: 0,
    col: 5,
    wins: false,
  });

  game.insertCoin("black", 4);
  assertEquals(game.getHistory()[1], {
    player: "black",
    move: 1,
    col: 4,
    wins: false,
  });

  game.insertCoin("white", 2);
  assertEquals(game.getHistory()[2], {
    player: "white",
    move: 2,
    col: 2,
    wins: false,
  });
  assertEquals(game.getHistory().length, 3);
});

Deno.test("Handles correctly when the game is won by white", () => {
  assertEquals(game.isOver(), undefined);
  game.insertCoin("white", 4);
  game.insertCoin("black", 3);
  game.insertCoin("white", 4);
  game.insertCoin("black", 3);
  game.insertCoin("white", 4);
  game.insertCoin("black", 3);
  game.insertCoin("white", 4);
  assertEquals(game.isOver(), "white");
});

Deno.test("Handles correctly when the game is won by black", () => {
  assertEquals(game.isOver(), undefined);
  game.insertCoin("white", 1);
  game.insertCoin("black", 3);
  game.insertCoin("white", 4);
  game.insertCoin("black", 3);
  game.insertCoin("white", 4);
  game.insertCoin("black", 3);
  game.insertCoin("white", 4);
  game.insertCoin("black", 3);
  assertEquals(game.isOver(), "black");
});

Deno.test("accepts custom configurations correctly", () => {
  const testGame = new Game(boardInstance, 2, "black");
  assertEquals(testGame.getPlayerToMove(), "black");
  testGame.insertCoin("black", 3);
  assertEquals(testGame.getPlayerToMove(), "white");
});
