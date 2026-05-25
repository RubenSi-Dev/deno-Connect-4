import { Board } from "../state/board.mts";
import { Game } from "../state/game.mts";
import { color, square } from "../state/types.mts";

const port = 8080;

let whiteSocket: WebSocket;
let blackSocket: WebSocket;

const sockets: WebSocket[] = [];

const game = new Game(new Board());

type ClientRequest = {
  type: string;
  [keys: string]: string | number;
};

type ServerResponse = {
  toMove: color;
  winner: color | "stalemate" | undefined;
  board: square[][];
};

function handleWs(sock: WebSocket) {
  sock.onopen = () => {
    if (!whiteSocket) {
      whiteSocket = sock;
      sockets.push(sock);
      console.log("white connected");
    } else if (!blackSocket) {
      blackSocket = sock;
      sockets.push(sock);
      console.log("black connected");
    } else {
      sock.close(409, "2 players already present");
    }
  };

  sock.onclose = () => {
    console.log("a client disconnected");
  };

  sock.addEventListener("message", (event) => {
    if (event.data === "ping") {
      sock.send("pong");
    }
  });

  sock.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as ClientRequest;
      const color = (sock === whiteSocket) ? "white" : "black";
      const resp = handleReq(msg, color);
      sockets.forEach((s) => s.send(JSON.stringify(resp)));
      //sock.send(JSON.stringify(resp));
    } catch (err) {
      sock.send(String(err));
    }
  };
}

function handleReq(
  req: ClientRequest,
  color: "white" | "black",
): ServerResponse {
  if (req.type === "insertCoin") {
    game.insertCoin(color, Number(req["col"]));
  }
  return {
    toMove: color,
    winner: game.isOver(),
    board: game.getBoard(),
  };
}

Deno.serve({ port }, (req) => {
  const { socket, response } = Deno.upgradeWebSocket(req);
  handleWs(socket);
  return response;
});
