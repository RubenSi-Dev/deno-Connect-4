import { Board } from "../state/board.mts";
import { Game } from "../state/game.mts";
import { color, colors } from "../state/types.mts";
import { ClientRequest, GameSettings, ServerResponse } from "./models.mts";

export class GameInstance {
  private players: WebSocket[];
  private game: Game | undefined;

  constructor(starter: WebSocket) {
    this.players = [starter];
    console.log("game is created");
  }

  public playerJoin(sock: WebSocket) {
    this.players.push(sock);
    console.log("new player joins");
  }

  public playerLeave(sock: WebSocket) {
    this.players = this.players.filter((playerSocket) => playerSocket !== sock);
    console.log("player leaves");
  }

  public startGame(settings?: GameSettings) {
    this.game = new Game(
      new Board("empty", settings?.rows, settings?.columns),
      this.players.length,
    );
    console.log("game starts");
  }

  public gameHasStarted(): boolean {
    return this.game !== undefined;
  }

  private getPlayerColor(player: WebSocket): color {
    return colors[this.players.findIndex((p) => p === player)];
  }

  private broadcastResponse(resp: ServerResponse): void {
    this.players.forEach((p) => p.send(JSON.stringify(resp)));
  }

  private sendResponse(resp: ServerResponse, player: WebSocket): void {
    player.send(JSON.stringify(resp));
  }

  public handleRequest(player: WebSocket, req: ClientRequest): void {
    if (!this.game) throw new Error("game has not started yet");

    switch (req.type) {
      case ("insertCoin"): {
        const playerColor = this.getPlayerColor(player);
        this.game.insertCoin(playerColor, Number(req["row"]));
        const response: ServerResponse = {
          toMove: this.game.getPlayerToMove(),
          winner: undefined,
          data: this.game.getBoard(),
        };
        this.broadcastResponse(response);
        break;
      }

      case ("getHistory"): {
        const response: ServerResponse = {
          toMove: this.game.getPlayerToMove(),
          winner: this.game.isOver(),
          data: this.game.getHistory(),
        };
        this.sendResponse(response, player);
        break;
      }
    }
  }
}
