import { randomUUID } from "node:crypto";
import { GameInstance } from "./game-instance.mts";
import { ClientRequest, ServerResponse } from "./models.mts";
import { GameError } from "../utils/game-error.mts";

const port = 8080;

/** Registry of all active game sessions, keyed by their UUID.
 * A `null` value means the game slot has been reserved (UUID issued) but the
 * creator's WebSocket connection has not yet been established. */
const games = new Map<string, GameInstance | null>();

/**
 * Attaches WebSocket event handlers (`onclose`, `onmessage`) to an already
 * upgraded socket and wires it into the existing {@link GameInstance} for the
 * given game UUID.
 *
 * On each incoming message the handler attempts to:
 * 1. Parse the raw JSON to recover the `requestId` (for error correlation).
 * 2. Fully parse the message as a {@link ClientRequest} and forward it to
 *    {@link GameInstance.handleRequest}.
 *
 * Any {@link GameError} thrown during handling is serialised as an `"ERROR"`
 * response and sent back to the client. Unknown errors are caught and reported
 * with the `"UNKNOWN"` error code.
 *
 * @param sock - The upgraded WebSocket for this player connection.
 * @param gameUUID - The UUID of the game the socket should be attached to.
 *   If no game with this UUID exists the socket is closed with code `1011`.
 */
function handleWs(sock: WebSocket, gameUUID: string) {
  const game = games.get(gameUUID);
  if (!game) {
    sock.close(1011, "game does not exist");
    return;
  }

  sock.onclose = () => {
    game.playerLeave(sock);
    console.log("a client disconnected");
  };

  sock.onmessage = (e) => {
    // Try to recover requestId even if handling fails, so the client's
    // awaited request() can resolve instead of hanging forever.
    let requestId: string | undefined;
    try {
      const raw = JSON.parse(e.data);
      requestId = raw?.requestId;
    } catch {
      const errorResponse: ServerResponse = {
        type: "ERROR",
        payload: {
          code: "INVALID_REQ_ID",
          explanation:
            "there was no request id in one of your requests, or it was invalid",
        },
      };
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify(errorResponse));
      }
    }

    try {
      const msg = JSON.parse(e.data) as ClientRequest;
      game.handleRequest(sock, msg);
    } catch (err) {
      let errorResponse: ServerResponse;
      if (err instanceof GameError) {
        errorResponse = {
          type: "ERROR",
          requestId: requestId,
          payload: {
            code: err.gameErrorCode,
            explanation: err.message,
          },
        };
      } else {
        errorResponse = {
          type: "ERROR",
          requestId: requestId,
          payload: {
            code: "UNKNOWN",
            explanation: "unknown error",
          },
        };
      }
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify(errorResponse));
      }
    }
  };
}

/**
 * HTTP + WebSocket server for Connect Four.
 *
 * Supported endpoints:
 *
 * ### `POST /games`
 * Creates a new game session. Returns `201` with `{ gameId: string }`.
 * The UUID is reserved immediately; the creator must connect via WebSocket
 * before the slot is fully initialised.
 *
 * ### `GET /games/:uuid/ws`
 * Upgrades the connection to a WebSocket and adds the client to the game
 * identified by `uuid`.
 * - The **first** client to connect becomes the game creator.
 * - Subsequent clients join as additional players.
 * Returns `404` if the UUID is not found.
 *
 * All other routes return `404`.
 */
Deno.serve({ port }, (req) => {
  const url = new URL(req.url);
  const method = req.method;

  // POST /games — plain HTTP: create a new game, return its UUID
  if (method === "POST" && url.pathname === "/games") {
    let uuid = randomUUID();
    while (games.has(uuid)) {
      uuid = randomUUID();
    }
    // Reserve the slot with a temporary placeholder so the UUID is valid
    // before the WebSocket connection is established.
    games.set(uuid, null);
    return new Response(JSON.stringify({ gameId: uuid }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /games/:uuid/ws — WebSocket upgrade: creator or joiner connects
  if (method === "GET") {
    const parts = url.pathname.split("/"); // ["", "games", uuid, "ws"]
    const [, path1, gameUUID, path3] = parts;

    if (path1 === "games" && gameUUID && path3 === "ws") {
      const isCreator = !games.get(gameUUID) && games.has(gameUUID);
      const isJoiner = !!games.get(gameUUID);

      if (!games.has(gameUUID)) {
        return new Response(JSON.stringify({ error: "Game not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);

      if (isCreator) {
        // First connection: this is the game creator
        games.set(gameUUID, new GameInstance(socket));
      } else if (isJoiner) {
        // Subsequent connections: joining players
        games.get(gameUUID)!.playerJoin(socket);
      }

      handleWs(socket, gameUUID);
      return response;
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
});
