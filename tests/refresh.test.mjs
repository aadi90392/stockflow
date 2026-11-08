import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequestGuard } from "../src/request-guard.ts";
test("slow pre-sale poll cannot replace the post-sale result", async () => {
  const guard = createRequestGuard();
  let visible = [];
  let release;
  const old = guard.begin();
  const pending = new Promise((resolve) => {
    release = resolve;
  }).then(() => {
    if (guard.isCurrent(old)) visible = [];
  });
  guard.invalidate();
  const fresh = guard.begin();
  if (guard.isCurrent(fresh)) visible = ["saved-sale"];
  release();
  await pending;
  assert.deepEqual(visible, ["saved-sale"]);
});
test("leaving a screen invalidates its outstanding request", () => {
  const guard = createRequestGuard();
  const sales = guard.begin();
  guard.invalidate();
  assert.equal(guard.isCurrent(sales), false);
  const ledger = guard.begin();
  assert.equal(guard.isCurrent(ledger), true);
});
