import { randomUUID, RandomUUIDOptions } from "node:crypto";
import { GameInstance } from "./game-instance.mts";
import { ClientRequest } from "./models.mts";

const port = 8080;

//let game: GameInstance;
const games = new Map<string, GameInstance>();

function handleWs(sock: WebSocket, gameUUID: string) {
	const game = games.get(gameUUID);
	if (!game) {
		throw new Error("game doesnt exist")
	}

  sock.onclose = () => {
    if (game) {
      game.playerLeave(sock);
    }
    console.log("a client disconnected");
  };

  sock.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as ClientRequest;
      if (!game.gameHasStarted()) game.startGame();
      game.handleRequest(sock, msg);
    } catch (err) {
      sock.send(String(err));
    }
  };
}

Deno.serve({ port }, (req) => {
  const url = new URL(req.url);
  const method = req.method;
  if (method === "POST" && url.pathname === "/games") {
    let uuid = randomUUID();
    while (games.get(uuid)) {
      uuid = randomUUID();
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    games.set(uuid, new GameInstance(socket));
    handleWs(socket, uuid);
    return response;
  } else if (method === "GET") {
    const [_, path1, gameUUID] = url.pathname.split("/");
    if (path1 === "games" && gameUUID) {
      const game = games.get(gameUUID);
      if (game) {
        const { socket, response } = Deno.upgradeWebSocket(req);
        game.playerJoin(socket);
        handleWs(socket, gameUUID);
        return response;
      }
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
});
