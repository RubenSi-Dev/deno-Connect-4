import { assert, assertEquals } from "@std/assert";
import { connectWebSocket, request } from "../../client/client-methods.mts";
import { ServerResponse } from "../../server/server-models.mts";
import { delay, waitOrTimeout } from "../../utils/helpers.mts";

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-net", "--allow-run", "./src/server/server.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

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
  const playerCount = 4;
  const players: WebSocket[] = [];
  const received: Set<ServerResponse>[] = [];
  // let 4 player join
  for (let i = 0; i < playerCount; i++) {
    received.push(new Set<ServerResponse>());
    await connectWebSocket(url, (e) => {
      received[i].add(JSON.parse(e.data) as ServerResponse);
    }).then(
      (sock) => players.push(sock),
    );
  }

  await request(players[0], "startGame");

  await request(players[0], "insertCoin", { "row": 3 });

  await waitOrTimeout(
    () =>
      received.every((r) =>
        Array.from(r).some((p) => p.type === "GAME_STARTED")
      ),
    1000,
  ).then((r) => assert(r));

  await waitOrTimeout(
    () =>
      received.every((r) =>
        Array.from(r).some((p) => p.type === "STATE_UPDATE")
      ),
    1000,
  ).then((r) => assert(r));

  received.forEach((p) => {
    let foundStart = false;
    let foundUpd = false;
    p.forEach((r) => {
      if (r.type === "GAME_STARTED") {
        assertEquals(r.payload.board[3].at(-1), null);
        foundStart = true;
      } else if (r.type === "STATE_UPDATE") {
        assertEquals(r.payload.board[3].at(-1), "white");
        foundUpd = true;
      }
    });
    assert(foundStart);
    assert(foundUpd);
  });

  await request(players[1], "insertCoin", { "row": 4 });
  await waitOrTimeout(() =>
    received.every((r) =>
      Array.from(r).some((p) =>
        p.type === "STATE_UPDATE" && p.payload.move === 2
      )
    )
  ).then((r) => assert(r));

  received.forEach((p) =>
    Array.from(p).some((r) =>
      r.type === "STATE_UPDATE" && r.payload.move === 2 &&
      r.payload.board[4].at(-1) === "black"
    )
  ),
    received.forEach((p) => {
      let found = false;
      p.forEach((r) => {
        if (r.type === "STATE_UPDATE" && r.payload.move === 2) {
          assertEquals(r.payload.board[4].at(-1), "black");
          found = true;
        }
      });
      assert(found);
    });

  await request(players[2], "insertCoin", { "row": 4 });

  await waitOrTimeout(() =>
    received.every((r) =>
      Array.from(r).some((p) =>
        p.type === "STATE_UPDATE" && p.payload.move === 3
      )
    )
  ).then((r) => assert(r));

  received.forEach((p) => {
    let found = false;
    p.forEach((r) => {
      if (r.type === "STATE_UPDATE" && r.payload.move === 3) {
        assertEquals(r.payload.board[4].at(-2), "blue");
        found = true;
      }
    });
    assert(found);
  });

  await request(players[3], "insertCoin", { "row": 2 });
  await waitOrTimeout(() =>
    received.every((r) =>
      Array.from(r).some((p) =>
        p.type === "STATE_UPDATE" && p.payload.move === 4
      )
    )
  ).then((r) => assert(r));

  received.forEach((p) => {
    let found = false;
    p.forEach((r) => {
      if (r.type === "STATE_UPDATE" && r.payload.move === 4) {
        assertEquals(r.payload.board[2].at(-1), "red");
        found = true;
      }
    });
    assert(found);
  });

  await request(players[0], "insertCoin", { "row": 2 });
  await waitOrTimeout(() =>
    received.every((r) =>
      Array.from(r).some((p) =>
        p.type === "STATE_UPDATE" && p.payload.move === 5
      )
    )
  ).then((r) => assert(r));

  received.forEach((p) => {
    let found = false;
    p.forEach((r) => {
      if (r.type === "STATE_UPDATE" && r.payload.move === 5) {
        assertEquals(r.payload.board[2].at(-2), "white");
        found = true;
      }
    });
    assert(found);
  });
});
