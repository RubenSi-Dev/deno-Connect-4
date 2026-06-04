import { randomUUID } from "node:crypto";
import { ServerResponse } from "../server/server-models.mts";
import { ClientRequest } from "../server/client-models.mts";

export function connectWebSocket(
  url: string,
  onMessage?: (e: MessageEvent) => void,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
    if (onMessage) {
      ws.addEventListener("message", onMessage);
    }
  });
}

export function request(
  ws: WebSocket,
  req: ClientRequest,
): Promise<ServerResponse> {
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
    req.requestId = requestId;
    ws.send(JSON.stringify(req));
  });
}
