import { Board } from "../state/board.mts";
import { Game } from "../state/game.mts";
import { color, colors } from "../state/types.mts";
import {
  ClientRequest,
  GameError,
  GameSettings,
  ServerResponse,
} from "./models.mts";

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
      this.broadcastResponse({
        type: "PLAYER_JOINED",
        payload: {
          playerCount: this.players.length,
        },
      });
    }, { once: true });
    console.log("new player joins");
  }

  public playerLeave(sock: WebSocket) {
    this.players = this.players.filter((playerSocket) => playerSocket !== sock);
    this.broadcastResponse({
      type: "PLAYER_LEFT",
      payload: {
        playerCount: this.players.length,
      },
    });
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

  private broadcastResponse(resp: ServerResponse, exclude?: WebSocket): void {
    const msg = JSON.stringify(resp);
    this.players.forEach((p) => {
      if (p !== exclude && p.readyState === WebSocket.OPEN) p.send(msg);
    });
  }

  private sendResponse(resp: ServerResponse, player: WebSocket): void {
    if (player.readyState === WebSocket.OPEN) player.send(JSON.stringify(resp));
  }

  private playerIsStarter(player: WebSocket): boolean {
    return player === this.players[0];
  }

  public handleRequest(player: WebSocket, req: ClientRequest): void {
    if (!req.requestId) {
      throw new GameError("INVALID_REQUEST", "please generate a request id");
    }
    switch (req.type) {
      case "startGame": {
        if (this.playerIsStarter(player) && !this.gameHasStarted()) {
          this.startGame();
        } else {throw new GameError(
            "INVALID_REQUEST",
            "game already has started or you are not starter",
          );}
        const response: ServerResponse = {
          type: "GAME_STARTED",
          payload: {
            board: this.game!.getBoard(),
            toMove: this.game!.getPlayerToMove(),
          },
        };
        // Ack only the requester with their requestId
        this.sendResponse({ requestId: req.requestId, ...response }, player);

        // Broadcast game-started event to everyone else (no requestId)
        this.broadcastResponse(response, player);
        return;
      }
    }

    if (!this.game) {
      throw new GameError("GAME_NOT_STARTED", "game has not started yet");
    }

    switch (req.type) {
      case "insertCoin": {
        const playerColor = this.getPlayerColor(player);
        this.game.insertCoin(playerColor, Number(req["row"]));
        const response: ServerResponse = {
          type: "STATE_UPDATE",
          payload: {
            board: this.game.getBoard(),
            toMove: this.game.getPlayerToMove(),
          },
        };
        this.sendResponse({ requestId: req.requestId, ...response }, player);
        this.broadcastResponse(response, player);
        break;
      }

      case "getHistory": {
        const response: ServerResponse = {
          type: "HISTORY",
          requestId: req.requestId,
          payload: {
            data: this.game.getHistory(),
          },
        };
        this.sendResponse(response, player);
        break;
      }

      case "getContext": {
        const response: ServerResponse = {
          type: "CONTEXT_UPDATE",
          requestId: req.requestId,
          payload: {
            yourColor: this.getPlayerColor(player),
            toMove: this.game.getPlayerToMove(),
            moveCount: this.game.getHistory().length,
            playerCount: this.players.length,
          },
        };
        this.sendResponse(response, player);
        break;
      }
    }
  }
}
