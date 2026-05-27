import { randomUUID } from "node:crypto";
import { ServerResponse } from "../server/models.mts";

export async function connectWebSocket(url: string): Promise<WebSocket> {
  await Promise.resolve();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
  });
}

export async function request(
  ws: WebSocket,
  type: string,
  extra?: Record<string, string | number>,
): Promise<ServerResponse> {
  await Promise.resolve();
  return new Promise<ServerResponse>((resolve) => {
    const requestId = randomUUID();

    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data) as ServerResponse;
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
