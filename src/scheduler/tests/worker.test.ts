// Tests for the scheduler worker's message protocol. Part of a port of
// team_race_scheduler by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyse } from "../analyse.ts";
import type { WorkerRequest, WorkerResponse } from "../types.ts";
import { handleRequest } from "../worker.ts";

function run(req: WorkerRequest): WorkerResponse[] {
  const out: WorkerResponse[] = [];
  handleRequest(req, (m) => out.push(m));
  return out;
}

describe("worker", () => {
  test("generate: progress, then exactly one done", () => {
    const msgs = run({ type: "generate", id: 7, nTeams: 10, nFlights: 2, seed: 1 });
    assert.ok(msgs.length >= 2);
    assert.ok(msgs.every((m) => m.id === 7));
    assert.ok(msgs.slice(0, -1).every((m) => m.type === "progress"));
    const done = msgs.at(-1)!;
    assert.equal(done.type, "done");
    if (done.type !== "done") return;
    assert.equal(done.report.hardOk, true);
    assert.deepEqual(done.report, analyse(done.schedule));
    assert.ok(done.elapsedMs >= 0);
    // structured-clonable
    assert.deepEqual(structuredClone(done), done);
  });

  test("analyse", () => {
    const schedule = { nTeams: 4, nFlights: 1, races: [[0, 1], [2, 1], [2, 3]] as [number, number][] };
    const msgs = run({ type: "analyse", id: 2, schedule, maxStint: 1 });
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, "done");
    if (msgs[0].type === "done") assert.deepEqual(msgs[0].report, analyse(schedule, 1));
  });

  test("errors end the request", () => {
    assert.deepEqual(run({ type: "generate", id: 3, nTeams: 2, nFlights: 1 }), [
      { type: "error", id: 3, message: "need at least 3 teams" },
    ]);
    const bad = run({ type: "analyse", id: 4, schedule: { nTeams: 2, nFlights: 1, races: [[0, 5]] } });
    assert.equal(bad.length, 1);
    assert.equal(bad[0].type, "error");
    const unknown = run({ type: "nope", id: 5 } as unknown as WorkerRequest);
    assert.deepEqual(unknown, [{ type: "error", id: 5, message: "Unknown request type: nope" }]);
  });
});
