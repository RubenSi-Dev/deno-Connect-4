import { Board } from "./state/board.mts";
import { Game } from "./state/game.mts";

// Demo: play a few moves and render the board
const game = new Game(new Board());

console.log(game.getBoardString());
game.insertCoin("white", 3);
console.log(game.getBoardString());
game.insertCoin("black", 3);
console.log(game.getBoardString());
game.insertCoin("white", 4);
console.log(game.getBoardString());
game.insertCoin("black", 2);
console.log(game.getBoardString());
game.insertCoin("white", 4);
console.log(game.getBoardString());
game.insertCoin("black", 1);
console.log(game.getBoardString());
game.insertCoin("white", 4);
console.log(game.getBoardString());
game.insertCoin("black", 0);
console.log(game.getBoardString());
game.insertCoin("white", 4);
console.log(game.getBoardString());
game.insertCoin("black", 0);
console.log(game.getBoardString());
