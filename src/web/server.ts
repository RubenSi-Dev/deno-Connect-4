import { randomUUID } from "node:crypto";
import { GameInstance } from "./game-instance.mts";
import { ClientRequest } from "./models.mts";

const port = 8080;

const games = new Map<string, GameInstance | null>();

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
    } catch { /* ignore parse errors here, handled below */ }

    try {
      const msg = JSON.parse(e.data) as ClientRequest;
      game.handleRequest(sock, msg);
    } catch (err) {
      const errorResponse = JSON.stringify({
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      if (sock.readyState === WebSocket.OPEN) sock.send(errorResponse);
    }
  };
}

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
