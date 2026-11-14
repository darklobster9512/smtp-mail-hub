// Lets server routes keep work running after the response (Workers ctx.waitUntil).
// The Worker entry (src/server.ts) stores the request ctx here; in the Node dev server there is no ctx
// and the promise simply keeps running.
import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { waitUntil(p: Promise<unknown>): void };
export const requestCtx = new AsyncLocalStorage<Ctx | undefined>();

export function runInBackground(p: Promise<unknown>) {
  const safe = p.catch((e) => console.error("background task failed", e));
  const ctx = requestCtx.getStore();
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(safe);
}
