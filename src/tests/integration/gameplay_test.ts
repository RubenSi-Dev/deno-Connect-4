import { connectWebSocket } from "../../client/client-methods.mts";

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-run", "./src/server/server.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

async function delay(ms: number): Promise<void> {
  await Promise.resolve(new Promise((resolve) => setTimeout(resolve, ms)));
}

function createGame(): Promise<string> {
  return fetch("http://localhost:8080/games", { method: "POST" })
    .then(
      (r) => r.json() as Promise<{ gameId: string }>,
    ).then((d) => d.gameId);
}

Deno.test.beforeEach(async () => {
  await delay(500);
});

Deno.test.afterAll(() => {
  serverProcess.kill("SIGTERM");
});

Deno.test("The correct game state is broadcasted on every move", async () => {
  const url = await createGame().then((g) =>
    `ws://localhost:8080/games/${g}/ws`
  );
  const players: WebSocket[] = [];
  for (let i = 0; i < 4; i++) {
    await connectWebSocket(url, (e) => console.log(`${i}: ${e.data}`)).then(
      (sock) => players.push(sock),
    );
  }
});
