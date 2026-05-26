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
    sock.addEventListener("open", () => {
      this.players.forEach((p) => {
        if (p !== sock && p.readyState === WebSocket.OPEN) {
          p.send(
            JSON.stringify({
              event: "playerJoined",
              playerCount: this.players.length,
            }),
          );
        }
      });
    }, { once: true });
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
    const msg = JSON.stringify(resp);
    this.players.forEach((p) => {
      if (p.readyState === WebSocket.OPEN) p.send(msg);
    });
  }

  private sendResponse(resp: ServerResponse, player: WebSocket): void {
    if (player.readyState === WebSocket.OPEN) player.send(JSON.stringify(resp));
  }

  private playerIsStarter(player: WebSocket): boolean {
    return player === this.players[0];
  }

  public handleRequest(player: WebSocket, req: ClientRequest): void {
    switch (req.type) {
      case "startGame": {
        if (this.playerIsStarter(player) && !this.gameHasStarted()) {
          this.startGame();
        } else {throw new Error(
            "game already has started or you are not starter",
          );}
        // Ack only the requester with their requestId
        this.sendResponse({
          requestId: req.requestId,
          toMove: this.game!.getPlayerToMove(),
          data: this.game!.getBoard(),
        }, player);
        // Broadcast game-started event to everyone else (no requestId)
        this.broadcastResponse({
          toMove: this.game!.getPlayerToMove(),
          data: this.game!.getBoard(),
        });
        return;
      }
    }

    if (!this.game) throw new Error("game has not started yet");

    switch (req.type) {
      case "insertCoin": {
        const playerColor = this.getPlayerColor(player);
        this.game.insertCoin(playerColor, Number(req["row"]));
        const response: ServerResponse = {
          requestId: req.requestId,
          toMove: this.game.getPlayerToMove(),
          data: this.game.getBoard(),
        };
        this.broadcastResponse(response);
        break;
      }

      case "getHistory": {
        const response: ServerResponse = {
          requestId: req.requestId,
          toMove: this.game.getPlayerToMove(),
          winner: this.game.isOver(),
          data: this.game.getHistory(),
        };
        this.sendResponse(response, player);
        break;
      }
      case "getColor": {
        const response: ServerResponse = {
          requestId: req.requestId,
          color: this.getPlayerColor(player),
        };
        this.sendResponse(response, player);
        break;
      }

      case "getContext": {
        const response: ServerResponse = {
          requestId: req.requestId,
          color: this.getPlayerColor(player),
          toMove: this.game.getPlayerToMove(),
          winner: this.game.isOver(),
          data: this.game.getBoard(),
        };
        this.sendResponse(response, player);
        break;
      }
    }
  }
}
