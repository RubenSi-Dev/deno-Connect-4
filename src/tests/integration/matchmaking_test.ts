import { assert, assertEquals, assertExists } from "@std/assert";
import { connectWebSocket, request } from "../../client/client-methods.mts";
import { ServerResponse } from "../../server/server-models.mts";
import { color, square } from "../../state/types.mts";
import { waitOrTimeout } from "../../utils/helpers.mts";

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-run", "./src/server/server.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

async function delay(ms: number): Promise<void> {
  await Promise.resolve(new Promise((resolve) => setTimeout(resolve, ms)));
}

Deno.test.beforeEach(async () => {
  await delay(500);
});

Deno.test.afterAll(() => {
  serverProcess.kill("SIGTERM");
});

function createGame(): Promise<string> {
  return fetch("http://localhost:8080/games", { method: "POST" })
    .then(
      (r) => r.json() as Promise<{ gameId: string }>,
    ).then((d) => d.gameId);
}

Deno.test("creating games works", async () => {
  const res = await fetch("http://localhost:8080/games", { method: "POST" })
    .then(
      (r) => r.json() as Promise<{ gameId: string }>,
    ).then((d) => d.gameId);
  assertExists(res);
});

Deno.test("Too much players join", async () => {
  const key = await createGame();
  const url = `ws://localhost:8080/games/${key}/ws`;

  const players: WebSocket[] = [];
  for (let i = 0; i < 10; i++) {
    players.push(
      await connectWebSocket(url, (e) => console.log(`player ${i}: ${e.data}`)),
    );
  }
});

Deno.test("creating a game and then joining and eventually starting the game", async () => {
  const key = await createGame();

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
  //await delay(700);
  await waitOrTimeout(() =>
    Array.from(wsMessages.values()).every((r) =>
      r.some((t) => t.type === "PLAYER_JOINED" && t.payload.playerCount === 3)
    )
  ).then((r) => assert(r));

  const res = await request(ws1, { type: "START_GAME" });
  assertEquals(res.type, "GAME_STARTED");
  await waitOrTimeout(
    () =>
      Array.from(wsMessages.values()).every((r) =>
        r.at(-1) !== undefined && r.at(-1)!.type === "GAME_STARTED"
      ),
  ).then((r) => assert(r));
  const lastws2payload = wsMessages.get("ws2")!.at(-1)!.payload as {
    board: square[][];
    toMove: color;
  };
  const lastws3payload = wsMessages.get("ws2")!.at(-1)!.payload as {
    board: square[][];
    toMove: color;
  };

  assertEquals(lastws2payload.toMove, "white");
  assertEquals(lastws3payload.toMove, "white");
});
