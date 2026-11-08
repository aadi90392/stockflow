import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:8788";
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const candidates = readdirSync(dir).filter(
  (x) => x.endsWith(".sqlite") && x !== "metadata.sqlite",
);
const path =
  process.env.LOCAL_DB_FILE || (candidates.length === 1 ? candidates[0] : null);
assert.ok(
  path && candidates.includes(path),
  "Set LOCAL_DB_FILE to the active local database filename when multiple local databases exist.",
);
const db = new DatabaseSync(join(dir, path));
const suffix = randomUUID();
function session(role) {
  const uid = randomUUID(),
    secret = randomUUID();
  db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
    uid,
    `${role}-${suffix}@example.test`,
    role,
    Date.now(),
  );
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    createHash("sha256").update(secret).digest("hex"),
    uid,
    Date.now() + 3600000,
  );
  return { uid, cookie: "sf_session=" + secret };
}
const owner = session("owner"),
  staff = session("staff"),
  outsider = session("outsider");
async function req(path, body, actor = owner, expected = 200) {
  const r = await fetch(origin + "/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      "content-type": "application/json",
      cookie: actor.cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  assert.equal(r.status, expected, JSON.stringify(data));
  return data;
}
const org = (await req("organizations", { name: "Integration " + suffix })).id;
const q = "?org=" + org;
await req("locations" + q, { name: "Main", address: "" });
await req("locations" + q, { name: "Store", address: "" });
const product = (
  await req("products" + q, {
    name: "Test product",
    sku: "SKU",
    category: "Test",
    price: 100,
    reorder: 5,
  })
).id;
let dashboard = await req("dashboard" + q);
const [a, b] = dashboard.locations;
await req("movements" + q, {
  productId: product,
  locationId: a.id,
  quantity: 10,
  kind: "adjustment",
  direction: "add",
  reason: "Opening",
  key: randomUUID(),
});
const results = await Promise.all(
  Array.from({ length: 20 }, async () => {
    const r = await fetch(origin + "/api/movements" + q, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({
        productId: product,
        locationId: a.id,
        quantity: 1,
        kind: "sale",
        reason: "Concurrent sale",
        key: randomUUID(),
      }),
    });
    return r.status;
  }),
);
assert.equal(results.filter((x) => x === 200).length, 10);
assert.equal(results.filter((x) => x === 409).length, 10);
dashboard = await req("dashboard" + q);
assert.equal(dashboard.products[0].quantity, 0);
const filtered = await req(
  "ledger" + q + "&product=" + product + "&location=" + a.id + "&kind=sale",
);
assert.equal(filtered.rows.length, 10);
assert.ok(
  filtered.rows.every(
    (r) =>
      r.kind === "sale" && r.product_id === product && r.location_id === a.id,
  ),
);
assert.equal((await req("ledger" + q + "&location=" + b.id)).rows.length, 0);
assert.equal((await req("ledger" + q + "&product=not-owned")).rows.length, 0);
const invite = await req("invite" + q);
await req("join", { code: invite.invite }, staff);
await req(
  "products" + q,
  { name: "Blocked", sku: "BLOCK", category: "", price: 1, reorder: 1 },
  staff,
  403,
);
await req("dashboard" + q, undefined, outsider, 404);
const csrf = await fetch(origin + "/api/locations" + q, {
  method: "POST",
  headers: {
    origin: "https://evil.example",
    "content-type": "application/json",
    cookie: owner.cookie,
  },
  body: JSON.stringify({ name: "Blocked" }),
});
assert.equal(csrf.status, 403);
const email = `auth-${suffix}@example.test`;
await req("auth/link", { email, name: "Local auth" });
const link = db
  .prepare("SELECT link FROM local_mail WHERE email=?")
  .get(email).link;
const token = new URLSearchParams(new URL(link).hash.slice(1)).get("signin");
await req("auth/verify", { token });
await req("auth/verify", { token }, owner, 400);
db.close();
console.log(
  "PASS: local Worker concurrent sales, staff permissions, tenant isolation, CSRF and single-use sign-in.",
);
