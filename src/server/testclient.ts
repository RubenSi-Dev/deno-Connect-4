import { randomUUID } from "node:crypto";
import { ServerResponseOld } from "./models.mts";
import type { color } from "../state/types.mts";
import { GameError } from "../utils/game-error.mts";

const res = await fetch("http://localhost:8080/games", { method: "POST" }).then(
  (r) => r.json() as Promise<{ gameId: string }>,
).then((d) => d.gameId);
console.log("Game ID:", res);

/**
 * Opens a WebSocket connection to the given URL and resolves when the
 * connection is fully established (`"open"` event fires).
 *
 * @param url - The WebSocket URL to connect to (e.g. `"ws://localhost:8080/games/:id/ws"`).
 * @returns A promise that resolves with the open {@link WebSocket} instance.
 * @throws The underlying {@link Event} if the socket emits an `"error"` event
 *   before opening.
 */
function connectWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
  });
}

/**
 * Sends a typed request over an open WebSocket and returns a promise that
 * resolves with the first server response whose `requestId` matches the one
 * generated for this call.
 *
 * Each call generates a unique UUID as the `requestId` and attaches a
 * one-shot message listener that resolves only when a matching reply arrives.
 * Unrelated or non-JSON messages are silently ignored.
 *
 * @param ws - An open {@link WebSocket} connected to the game server.
 * @param type - The request type string (e.g. `"insertCoin"`, `"startGame"`).
 * @param extra - Optional additional fields to merge into the request payload
 *   (e.g. `{ row: 3 }` for `"insertCoin"`).
 * @returns A promise that resolves with the {@link ServerResponseOld} whose
 *   `requestId` matches the generated ID.
 */
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

/**
 * Queries each WebSocket in `wss` for its assigned player color and returns a
 * map from color to socket for convenient turn-routing.
 *
 * @param wss - Array of open {@link WebSocket} connections to query.
 * @returns A promise that resolves with a `Map<color, WebSocket>` where each
 *   entry maps a player's {@link color} to their socket.
 * @throws {@link GameError} with code `INTERNAL_ERROR` if any socket responds
 *   without a valid color.
 */
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
