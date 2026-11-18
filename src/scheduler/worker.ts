// Module Web Worker that runs the scheduler off the main thread.
//
// Part of a TypeScript port of team_race_scheduler by Henry Hollingworth,
// https://github.com/Ninjamouse-1000/team_race_scheduler, MIT licence.
//
// Usage (from src/app/<route>/; a relative URL is what Turbopack resolves):
//   const worker = new Worker(new URL("../../scheduler/worker.ts", import.meta.url), { type: "module" });
//   worker.postMessage({ type: "generate", id: 1, nTeams: 12, nFlights: 2 } satisfies WorkerRequest);
//
// Each request gets zero or more "progress" messages and then exactly one
// "done" or "error". The search is synchronous, so requests are handled one
// at a time; to cancel, terminate the worker.
import type { WorkerRequest, WorkerResponse } from "./types.ts";
import { analyse } from "./analyse.ts";
import { generate } from "./generate.ts";

/** Handle one request, sending its messages through post. */
export function handleRequest(req: WorkerRequest, post: (msg: WorkerResponse) => void): void {
  const id = typeof req?.id === "number" ? req.id : -1;
  const start = performance.now();
  try {
    if (req?.type === "generate") {
      const schedule = generate(req, (p) => post({ type: "progress", id, ...p }));
      const report = analyse(schedule, req.maxStint ?? 2);
      post({ type: "done", id, schedule, report, elapsedMs: performance.now() - start });
    } else if (req?.type === "analyse") {
      const report = analyse(req.schedule, req.maxStint ?? 2);
      post({ type: "done", id, schedule: req.schedule, report, elapsedMs: performance.now() - start });
    } else {
      post({ type: "error", id, message: `Unknown request type: ${String((req as { type?: unknown })?.type)}` });
    }
  } catch (e) {
    post({ type: "error", id, message: e instanceof Error ? e.message : String(e) });
  }
}

// Only wire up the message handler inside a worker, so tests can import this.
interface WorkerScope {
  postMessage(msg: WorkerResponse): void;
  addEventListener(type: "message", listener: (e: MessageEvent<WorkerRequest>) => void): void;
}
declare const WorkerGlobalScope: { new (): unknown } | undefined;
if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
  const scope = self as unknown as WorkerScope;
  scope.addEventListener("message", (e) => handleRequest(e.data, (msg) => scope.postMessage(msg)));
}
