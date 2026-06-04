import { Board } from "../state/board.mts";
import { Game } from "../state/game.mts";
import { color, colors } from "../state/types.mts";
import { ClientRequest, GameSettings, ServerResponse } from "./server-models.mts";
import { GameError } from "../utils/game-error.mts";

/**
 * Manages a single Connect Four game session including the set of connected
 * WebSocket players, the game state, and all client–server communication.
 *
 * Responsibilities:
 * - Track connected player sockets and assign colors by join order.
 * - Route incoming {@link ClientRequest} messages to the correct game action.
 * - Broadcast {@link ServerResponse} events to all or individual players.
 */
export class GameInstance {
  /** Ordered list of connected player WebSockets; index maps to player color. */
  private players: (WebSocket | null)[];
  /** The active game, or `undefined` before {@link startGame} is called. */
  private game: Game | undefined;

  /**
   * Creates a new game instance with the creator's socket as the first player.
   *
   * @param starter - The WebSocket of the player who created the game.
   */
  constructor(starter: WebSocket) {
    this.players = [starter];
    console.log("game is created");
  }

  /**
   * Adds a new player to the session and broadcasts a `PLAYER_JOINED` event
   * to all connected players once the new socket is open.
   *
   * @param sock - The WebSocket of the joining player.
   */
  public playerJoin(sock: WebSocket) {
    if (this.playersAmount() >= colors.length) {
      sock.addEventListener("open", () => {
        this.sendResponse({
          type: "ERROR",
          payload: {
            code: "GAME_FULL",
            explanation: "This game instance is already full",
          },
        }, sock);
      }, { once: true });
      return;
    }
    // If a player has left in the past, fill in his gap
    const idx = this.players.findIndex((p) => p === null);
    if (idx !== -1) {
      this.players[idx] = sock;
    } else {
      this.players.push(sock);
    }
    sock.addEventListener("open", () => {
      this.broadcastResponse({
        type: "PLAYER_JOINED",
        payload: {
          playerCount: this.playersAmount(),
        },
      });
    }, { once: true });
    console.log("new player joins");
  }

  /**
   * Removes a disconnected player from the session and broadcasts a
   * `PLAYER_LEFT` event to the remaining players.
   *
   * @param sock - The WebSocket of the player who left.
   */
  public playerLeave(sock: WebSocket) {
    //this.players = this.players.filter((playerSocket) => playerSocket !== sock);
    this.players = this.players.map((p) => {
      if (p === sock) {
        return null;
      }
      return sock;
    });
    this.game;
    this.broadcastResponse({
      type: "PLAYER_LEFT",
      payload: {
        playerCount: this.playersAmount(),
      },
    });
    console.log("player leaves");
  }

  /**
   * Instantiates a new {@link Game} with the current number of connected
   * players and the provided board settings.
   *
   * @param settings - Optional board dimensions and player count overrides.
   *   When omitted, the game uses defaults from {@link Board} and the current
   *   number of connected players.
   */
  public startGame(settings?: GameSettings) {
    this.game = new Game(
      new Board("empty", settings?.rows, settings?.columns),
      this.players.length,
    );
    console.log("game starts");
  }

  /**
   * Returns whether the game has been started.
   *
   * @returns `true` if {@link startGame} has been called, `false` otherwise.
   */
  public gameHasStarted(): boolean {
    return this.game !== undefined;
  }

  private playersAmount(): number {
    return this.players.reduce((acc, pl) => acc + (pl ? 1 : 0), 0);
  }

  /**
   * Resolves the color assigned to a given player socket based on its
   * position in the join-order list.
   *
   * @param player - The WebSocket whose color should be looked up.
   * @returns The {@link color} assigned to that player.
   */
  private getPlayerColor(player: WebSocket): color {
    return colors[this.players.findIndex((p) => p === player)];
  }

  /**
   * Sends a serialised {@link ServerResponse} to every connected player whose
   * socket is open, optionally skipping one socket.
   *
   * @param resp - The response object to broadcast.
   * @param exclude - An optional socket to skip (e.g. the requester who will
   *   receive an individual acknowledgement instead).
   */
  private broadcastResponse(
    resp: ServerResponse,
    exclude?: WebSocket,
  ): void {
    const msg = JSON.stringify(resp);
    this.players.forEach((p) => {
      if (p && p !== exclude && p.readyState === WebSocket.OPEN) p.send(msg);
    });
  }

  /**
   * Sends a serialised {@link ServerResponse} to a single player if their
   * socket is currently open.
   *
   * @param resp - The response object to send.
   * @param player - The target WebSocket.
   */
  private sendResponse(resp: ServerResponse, player: WebSocket): void {
    if (player.readyState === WebSocket.OPEN) player.send(JSON.stringify(resp));
  }

  /**
   * Returns whether the given socket belongs to the player who created the
   * game (index 0 in the players list).
   *
   * @param player - The WebSocket to check.
   * @returns `true` if the socket is the game creator's.
   */
  private playerIsStarter(player: WebSocket): boolean {
    return player === this.players[0];
  }

  /**
   * Dispatches an incoming client request to the appropriate game action and
   * sends the resulting response(s) back to the relevant sockets.
   *
   * Supported request types:
   * - `"startGame"` – Starts the game (creator only, once).
   * - `"insertCoin"` – Drops a coin into a column on behalf of the current player.
   * - `"getHistory"` – Returns the full move history to the requester.
   * - `"getContext"` – Returns the requester's current game context.
   *
   * @param player - The WebSocket that sent the request.
   * @param req - The parsed {@link ClientRequest} message.
   * @throws {@link GameError} with code `INVALID_REQUEST` if `requestId` is
   *   missing, if a non-starter tries to start the game, or if the game has
   *   already started when `"startGame"` is received.
   * @throws {@link GameError} with code `GAME_NOT_STARTED` if a game-dependent
   *   request arrives before the game has been started.
   */
  public handleRequest(player: WebSocket, req: ClientRequest): void {
    if (!req.requestId) {
      throw new GameError("INVALID_REQUEST", "please generate a request id");
    }
    switch (req.type) {
      case "START_GAME": {
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
      case "INSERT_COIN": {
        const playerColor = this.getPlayerColor(player);
        this.game.insertCoin(playerColor, Number(req["row"]));
        const response: ServerResponse = {
          type: "STATE_UPDATE",
          payload: {
            board: this.game.getBoard(),
            toMove: this.game.getPlayerToMove(),
            move: (this.game.getHistory().at(-1)!.move ?? -1) + 1,
          },
        };
        this.sendResponse({ requestId: req.requestId, ...response }, player);
        this.broadcastResponse(response, player);
        break;
      }

      case "GET_HISTORY": {
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

      case "GET_COLOR": {
        const response: ServerResponse = {
          type: "CONTEXT_UPDATE",
          requestId: req.requestId,
          payload: {
            yourColor: this.getPlayerColor(player),
            toMove: this.game.getPlayerToMove(),
            moveCount: this.game.getHistory().length,
            playerCount: this.playersAmount(),
          },
        };
        this.sendResponse(response, player);
        break;
      }
    }
  }
}
