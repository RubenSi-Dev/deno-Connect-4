import { GameInstance } from "./game-instance.mts";
import { ClientRequest } from "./models.mts";

const port = 8080;

let game: GameInstance;

function handleWs(sock: WebSocket) {
  sock.onopen = () => {
    if (!game) {
      game = new GameInstance(sock);
    } else {
      game.playerJoin(sock);
    }
  };

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
  const { socket, response } = Deno.upgradeWebSocket(req);
  handleWs(socket);
  return response;
});
