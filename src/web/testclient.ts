import { randomUUID } from "node:crypto";
import { GameError, ServerResponseOld } from "./models.mts";
import type { color } from "../state/types.mts";

const res = await fetch("http://localhost:8080/games", { method: "POST" }).then(
  (r) => r.json() as Promise<{ gameId: string }>,
).then((d) => d.gameId);
console.log("Game ID:", res);

function connectWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
  });
}

function request(
  ws: WebSocket,
  type: string,
  extra?: Record<string, string | number>,
): Promise<ServerResponseOld> {
  return new Promise<ServerResponseOld>((resolve) => {
    const requestId = randomUUID();

    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data) as ServerResponseOld;
        if (msg.requestId === requestId) {
          ws.removeEventListener("message", handler);
          resolve(msg);
        }
      } catch {
        // Ignore non-JSON or unrelated messages
      }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ type, requestId, ...extra }));
  });
}

async function matchColors(wss: WebSocket[]): Promise<Map<color, WebSocket>> {
  const result = new Map<color, WebSocket>();
  for (const ws of wss) {
    await request(ws, "getColor").then((r) => {
      if (!r.color) throw new GameError("INTERNAL_ERROR", "invalid state");
      result.set(r.color, ws);
    });
  }
  return result;
}

const [p0, p1, p2] = await Promise.all([
  connectWebSocket(`ws://localhost:8080/games/${res}/ws`),
  connectWebSocket(`ws://localhost:8080/games/${res}/ws`),
  connectWebSocket(`ws://localhost:8080/games/${res}/ws`),
]);

// Log all incoming messages (broadcasts + events)
[p0, p1, p2].forEach((p, idx) => {
  p.onmessage = (e) => {
    console.log(`Player ${idx} received:`, e.data);
  };
});

// Explicitly start the game before querying game state
await request(p1, "startGame");
console.log("Game started!");

let resp = await request(p0, "startGame");
const colormap = await matchColors([p0, p1, p2]);
if (!resp.toMove) throw new GameError("INTERNAL_ERROR", "bad state");
let playerToMove = colormap.get(resp.toMove);
if (!playerToMove) throw new GameError("INTERNAL_ERROR", "bad state");

resp = await request(playerToMove, "insertCoin", { "row": 5 });

playerToMove = colormap.get(resp.toMove!);

resp = await request(playerToMove!, "insertCoin", { "row": 5 });

playerToMove = colormap.get(resp.toMove!);

resp = await request(playerToMove!, "insertCoin", { "row": 5 });

playerToMove = colormap.get(resp.toMove!);

resp = await request(playerToMove!, "insertCoin", { "row": 5 });
