import { assertEquals, assertExists } from "@std/assert";
import { connectWebSocket, request } from "../../client/client-methods.mts";
import { ServerResponse } from "../../server/models.mts";
import { color, square } from "../../state/types.mts";

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-run", "./src/server/server.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

Deno.test.beforeEach(async () => {
  await delay(500);
});

Deno.test("creating games works", async () => {
  const res = await fetch("http://localhost:8080/games", { method: "POST" })
    .then(
      (r) => r.json() as Promise<{ gameId: string }>,
    ).then((d) => d.gameId);
  assertExists(res);
});

Deno.test("creating a game and then joining and eventually starting the game", async () => {
  const key = await fetch("http://localhost:8080/games", { method: "POST" })
    .then(
      (r) => r.json() as Promise<{ gameId: string }>,
    ).then((d) => d.gameId);

  const wsMessages = new Map<string, ServerResponse[]>([["ws1", []], [
    "ws2",
    [],
  ], ["ws3", []]]);

  const ws1 = await connectWebSocket(`ws://localhost:8080/games/${key}/ws`);
  ws1.onmessage = (e) =>
    wsMessages.get("ws1")!.push(JSON.parse(e.data) as ServerResponse);

  const ws2 = await connectWebSocket(`ws://localhost:8080/games/${key}/ws`);
  ws2.onmessage = (e) =>
    wsMessages.get("ws2")!.push(JSON.parse(e.data) as ServerResponse);

  const ws3 = await connectWebSocket(`ws://localhost:8080/games/${key}/ws`);
  ws3.onmessage = (e) =>
    wsMessages.get("ws3")!.push(JSON.parse(e.data) as ServerResponse);

  assertExists(ws1);
  assertExists(ws2);
  assertExists(ws3);
  await delay(500);

  wsMessages.get("ws1")!.forEach((m) => assertEquals(m.type, "PLAYER_JOINED"));
  wsMessages.get("ws2")!.forEach((m) => assertEquals(m.type, "PLAYER_JOINED"));
  wsMessages.get("ws3")!.forEach((m) => assertEquals(m.type, "PLAYER_JOINED"));

  assertEquals(wsMessages.get("ws1")!.at(-1), {
    type: "PLAYER_JOINED",
    payload: { playerCount: 3 },
  });
  assertEquals(wsMessages.get("ws2")!.at(-1), {
    type: "PLAYER_JOINED",
    payload: { playerCount: 3 },
  });
  assertEquals(wsMessages.get("ws3")!.at(-1), {
    type: "PLAYER_JOINED",
    payload: { playerCount: 3 },
  });

  const res = await request(ws1, "startGame");
  assertEquals(res.type, "GAME_STARTED");
  await delay(500);
  const lastws2payload = wsMessages.get("ws2")!.at(-1)!.payload as {
    board: square[][];
    toMove: color;
  };
  const lastws3payload = wsMessages.get("ws2")!.at(-1)!.payload as {
    board: square[][];
    toMove: color;
  };

  assertEquals(wsMessages.get("ws2")!.at(-1)!.type, "GAME_STARTED");
  assertEquals(wsMessages.get("ws3")!.at(-1)!.type, "GAME_STARTED");

  assertEquals(lastws2payload.toMove, "white");
  assertEquals(lastws3payload.toMove, "white");
});

Deno.test.afterAll(() => {
  serverProcess.kill("SIGTERM");
});

async function delay(ms: number): Promise<void> {
  await Promise.resolve(new Promise((resolve) => setTimeout(resolve, ms)));
}
