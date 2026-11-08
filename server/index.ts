import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  BREVO_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_ORIGIN?: string;
  LOCAL_MAIL?: string;
};
type User = { id: string; name: string; email: string };
const app = new Hono<{
  Bindings: Env;
  Variables: { user: User; org: string; role: string };
}>();
const id = () => crypto.randomUUID();
const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
class Problem extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function ensure(v: unknown, message: string, status = 400): asserts v {
  if (!v) throw new Problem(status, message);
}
const text = (n = 120) => z.string().trim().min(1).max(n);
const qty = z.coerce.number().int().min(1).max(1000000);
async function payload(c: any, schema: z.ZodType) {
  const raw = await c.req.text();
  ensure(raw.length < 140000, "Request too large", 413);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Problem(400, "Invalid JSON");
  }
  return schema.parse(data) as any;
}
async function limit(db: D1Database, key: string, max: number) {
  const now = Date.now();
  const row = await db
    .prepare(
      "INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count",
    )
    .bind(key, now + 900000, now, now)
    .first<{ count: number }>();
  ensure(
    row && row.count <= max,
    "Too many attempts. Try again in 15 minutes.",
    429,
  );
}
app.use("/api/*", async (c, next) => {
  const origin = new URL(c.req.url).origin;
  if (c.req.method !== "GET") {
    ensure(c.req.header("origin") === origin, "Invalid origin", 403);
    ensure(
      c.req.header("content-type")?.includes("application/json"),
      "JSON required",
      415,
    );
  }
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
});
app.get("/api/health", async (c) => {
  await c.env.DB.prepare("SELECT 1").first();
  return c.json({ status: "ok" });
});
app.post("/api/auth/link", async (c) => {
  const b = await payload(
    c,
    z.object({ email: z.email().max(180), name: text(60) }),
  );
  b.email = b.email.toLowerCase();
  await limit(c.env.DB, "login-ip:" + c.req.header("cf-connecting-ip"), 15);
  await limit(c.env.DB, "login-email:" + (await hash(b.email)), 5);
  const local =
    c.env.LOCAL_MAIL === "true" &&
    ["localhost", "127.0.0.1"].includes(new URL(c.req.url).hostname);
  ensure(
    local || (c.env.BREVO_API_KEY && c.env.EMAIL_FROM && c.env.APP_ORIGIN),
    "Email sign-in is not configured yet.",
    503,
  );
  const secret = token();
  const digest = await hash(secret);
  const origin = local
    ? "http://127.0.0.1:5174"
    : new URL(c.env.APP_ORIGIN!).origin;
  const link = origin + "/#signin=" + secret;
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM auth_links WHERE email=? OR expires<?").bind(
      b.email,
      Date.now(),
    ),
    c.env.DB.prepare("INSERT INTO auth_links VALUES(?,?,?,?)").bind(
      digest,
      b.email,
      b.name,
      Date.now() + 15 * 60000,
    ),
  ]);
  if (local) {
    await c.env.DB.prepare("INSERT OR REPLACE INTO local_mail VALUES(?,?,?)")
      .bind(b.email, link, Date.now())
      .run();
  } else {
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": c.env.BREVO_API_KEY!.trim(),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "StockFlow", email: c.env.EMAIL_FROM!.trim() },
          to: [{ email: b.email }],
          subject: "Your secure StockFlow sign-in link",
          textContent:
            "Sign in to StockFlow: " +
            link +
            "\nThis link works once and expires in 15 minutes. Do not share it. If you did not request it, ignore this email.",
          htmlContent:
            '<div style="background:#f4f6ef;padding:32px;font-family:Arial"><div style="max-width:500px;margin:auto;background:white;padding:32px;border-radius:20px"><h2 style="color:#164e43">StockFlow</h2><h1>Your stock. One clear picture.</h1><p>Sign in to manage products, receive purchases and track stock across your locations.</p><p style="padding:20px 0"><a style="background:#164e43;color:white;padding:16px 24px;border-radius:8px;text-decoration:none" href="' +
            link +
            '">Sign in to StockFlow →</a></p><p>This link expires in 15 minutes and works once. Do not share it.</p><p>If you did not request this email, you can ignore it.</p></div></div>',
        }),
        signal: AbortSignal.timeout(10000),
      });
      ensure(r.ok, "Email could not be sent. Please try later.", 503);
    } catch {
      await c.env.DB.prepare("DELETE FROM auth_links WHERE token=?")
        .bind(digest)
        .run();
      throw new Problem(503, "Email could not be sent. Please try later.");
    }
  }
  return c.json({
    message: "Check your inbox and spam folder for your sign-in link.",
  });
});
app.post("/api/auth/verify", async (c) => {
  const b = await payload(
    c,
    z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }),
  );
  await limit(c.env.DB, "verify:" + c.req.header("cf-connecting-ip"), 30);
  const link = await c.env.DB.prepare(
    "DELETE FROM auth_links WHERE token=? AND expires>? RETURNING email,name",
  )
    .bind(await hash(b.token), Date.now())
    .first<{ email: string; name: string }>();
  ensure(link, "This link is expired or has already been used.");
  const newId = id();
  await c.env.DB.prepare(
    "INSERT INTO users VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING",
  )
    .bind(newId, link.email, link.name, Date.now())
    .run();
  const user = await c.env.DB.prepare(
    "SELECT id,name,email FROM users WHERE email=?",
  )
    .bind(link.email)
    .first<User>();
  ensure(user, "Unable to sign in", 500);
  const session = token();
  await c.env.DB.prepare("INSERT INTO sessions VALUES(?,?,?)")
    .bind(await hash(session), user.id, Date.now() + 7 * 86400000)
    .run();
  setCookie(c, "sf_session", session, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return c.json({ user });
});
app.use("/api/*", async (c, next) => {
  const session = getCookie(c, "sf_session");
  const user = session
    ? await c.env.DB.prepare(
        "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
      )
        .bind(await hash(session), Date.now())
        .first<User>()
    : null;
  if (c.req.path === "/api/me") {
    return c.json({ user });
  }
  ensure(user, "Sign in to continue.", 401);
  c.set("user", user);
  if (c.req.method !== "GET") await limit(c.env.DB, "write:" + user.id, 150);
  await next();
});
app.post("/api/auth/logout", async (c) => {
  await c.env.DB.prepare("DELETE FROM sessions WHERE token=?")
    .bind(await hash(getCookie(c, "sf_session") || ""))
    .run();
  deleteCookie(c, "sf_session", { path: "/" });
  return c.json({ ok: true });
});
app.get("/api/organizations", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT o.id,o.name,m.role FROM organizations o JOIN members m ON m.org_id=o.id WHERE m.user_id=?",
      )
        .bind(c.get("user").id)
        .all()
    ).results,
  ),
);
app.post("/api/organizations", async (c) => {
  const b = await payload(c, z.object({ name: text(80) }));
  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) n FROM members WHERE user_id=? AND role='owner'",
  )
    .bind(c.get("user").id)
    .first<{ n: number }>();
  ensure((count?.n || 0) < 5, "You can own up to five organizations.");
  const org = id();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO organizations VALUES(?,?,?)").bind(
      org,
      b.name,
      token(),
    ),
    c.env.DB.prepare("INSERT INTO members VALUES(?,?,'owner')").bind(
      org,
      c.get("user").id,
    ),
  ]);
  return c.json({ id: org });
});
app.post("/api/join", async (c) => {
  const b = await payload(c, z.object({ code: text(100) }));
  await limit(c.env.DB, "join:" + c.get("user").id, 10);
  const org = await c.env.DB.prepare(
    "SELECT id FROM organizations WHERE invite=?",
  )
    .bind(b.code)
    .first<{ id: string }>();
  ensure(org, "Invalid invitation code.");
  await c.env.DB.prepare(
    "INSERT INTO members VALUES(?,?,'staff') ON CONFLICT DO NOTHING",
  )
    .bind(org.id, c.get("user").id)
    .run();
  return c.json(org);
});
app.use("/api/*", async (c, next) => {
  const org = c.req.query("org") || "";
  const m = await c.env.DB.prepare(
    "SELECT role FROM members WHERE org_id=? AND user_id=?",
  )
    .bind(org, c.get("user").id)
    .first<{ role: string }>();
  ensure(m, "Organization not found.", 404);
  c.set("org", org);
  c.set("role", m.role);
  await next();
});
const manage = (c: any) =>
  ensure(
    ["owner", "manager"].includes(c.get("role")),
    "Only owners and managers can do this.",
    403,
  );
async function owned(c: any, table: string, key: string) {
  const r = await c.env.DB.prepare(
    `SELECT * FROM ${table} WHERE id=? AND org_id=?`,
  )
    .bind(key, c.get("org"))
    .first();
  ensure(r, "Record not found.", 404);
  return r as any;
}
app.get("/api/dashboard", async (c) => {
  const db = c.env.DB,
    o = c.get("org");
  const query = async (sql: string) =>
    (await db.prepare(sql).bind(o).all()).results;
  return c.json({
    products: await query(
      "SELECT p.*,COALESCE(SUM(s.quantity),0) quantity,(SELECT updated_at FROM photos WHERE product_id=p.id) photo FROM products p LEFT JOIN stock s ON s.product_id=p.id WHERE p.org_id=? GROUP BY p.id ORDER BY p.name",
    ),
    locations: await query(
      "SELECT * FROM locations WHERE org_id=? ORDER BY name",
    ),
    suppliers: await query(
      "SELECT * FROM suppliers WHERE org_id=? ORDER BY name",
    ),
    stock: await query(
      "SELECT s.*,p.name,p.sku,p.reorder,l.name location FROM stock s JOIN products p ON p.id=s.product_id JOIN locations l ON l.id=s.location_id WHERE p.org_id=? ORDER BY p.name",
    ),
    orders: await query(
      "SELECT o.*,p.name product,s.name supplier,l.name location FROM orders o JOIN products p ON p.id=o.product_id JOIN suppliers s ON s.id=o.supplier_id JOIN locations l ON l.id=o.location_id WHERE o.org_id=? ORDER BY o.created_at DESC LIMIT 200",
    ),
    transfers: await query(
      "SELECT t.*,p.name product,a.name source,b.name destination FROM transfers t JOIN products p ON p.id=t.product_id JOIN locations a ON a.id=t.source_id JOIN locations b ON b.id=t.destination_id WHERE t.org_id=? ORDER BY t.created_at DESC LIMIT 200",
    ),
    members: await query(
      "SELECT u.id,u.name,u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.org_id=?",
    ),
    role: c.get("role"),
  });
});
app.get("/api/ledger", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  ensure(Number.isInteger(page) && page <= 100000, "Invalid page");
  const filter =
    c.req.query("sales") === "1" ? " AND m.kind IN ('sale','return')" : "";
  const rows = await c.env.DB.prepare(
    "SELECT m.*,p.name product,p.sku,l.name location,u.name actor FROM movements m JOIN products p ON p.id=m.product_id JOIN locations l ON l.id=m.location_id JOIN users u ON u.id=m.actor_id WHERE m.org_id=?" +
      filter +
      " ORDER BY m.created_at DESC,m.id DESC LIMIT 51 OFFSET ?",
  )
    .bind(c.get("org"), (page - 1) * 50)
    .all();
  return c.json({
    rows: rows.results.slice(0, 50),
    hasNext: rows.results.length > 50,
    page,
  });
});
app.get("/api/invite", async (c) => {
  manage(c);
  return c.json(
    await c.env.DB.prepare("SELECT invite FROM organizations WHERE id=?")
      .bind(c.get("org"))
      .first(),
  );
});
app.post("/api/invite/rotate", async (c) => {
  ensure(
    c.get("role") === "owner",
    "Only the owner can rotate invitations.",
    403,
  );
  await c.env.DB.prepare("UPDATE organizations SET invite=? WHERE id=?")
    .bind(token(), c.get("org"))
    .run();
  return c.json({ ok: true });
});
app.post("/api/members", async (c) => {
  ensure(
    c.get("role") === "owner",
    "Only the owner can manage teammates.",
    403,
  );
  const b = await payload(
    c,
    z.object({ userId: text(), role: z.enum(["manager", "staff", "remove"]) }),
  );
  ensure(b.userId !== c.get("user").id, "You cannot change your own role.");
  if (b.role === "remove") {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM members WHERE org_id=? AND user_id=? AND role<>'owner'",
      ).bind(c.get("org"), b.userId),
      c.env.DB.prepare("UPDATE organizations SET invite=? WHERE id=?").bind(
        token(),
        c.get("org"),
      ),
    ]);
  } else
    await c.env.DB.prepare(
      "UPDATE members SET role=? WHERE org_id=? AND user_id=? AND role<>'owner'",
    )
      .bind(b.role, c.get("org"), b.userId)
      .run();
  return c.json({ ok: true });
});
app.post("/api/locations", async (c) => {
  manage(c);
  const b = await payload(
    c,
    z.object({
      name: text(80),
      address: z.string().trim().max(200).default(""),
    }),
  );
  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) n FROM locations WHERE org_id=?",
  )
    .bind(c.get("org"))
    .first<{ n: number }>();
  ensure((count?.n || 0) < 30, "Limit: 30 locations.");
  await c.env.DB.prepare("INSERT INTO locations VALUES(?,?,?,?)")
    .bind(id(), c.get("org"), b.name, b.address)
    .run();
  return c.json({ ok: true });
});
app.post("/api/suppliers", async (c) => {
  manage(c);
  const b = await payload(
    c,
    z.object({
      name: text(80),
      email: z.union([z.email(), z.literal("")]).default(""),
      phone: z.string().max(30).default(""),
    }),
  );
  await c.env.DB.prepare("INSERT INTO suppliers VALUES(?,?,?,?,?)")
    .bind(id(), c.get("org"), b.name, b.email, b.phone)
    .run();
  return c.json({ ok: true });
});
app.post("/api/products", async (c) => {
  manage(c);
  const b = await payload(
    c,
    z.object({
      id: z.string().optional(),
      name: text(100),
      sku: text(40),
      category: z.string().trim().max(60),
      price: z.coerce.number().int().min(0).max(100000000),
      reorder: z.coerce.number().int().min(0).max(1000000),
      photo: z.string().max(131095).optional(),
    }),
  );
  const product = b.id || id();
  if (b.id) await owned(c, "products", product);
  let image: string | undefined;
  if (b.photo !== undefined) {
    image = b.photo;
    if (image) {
      const { validateRoomPhoto } = await import("./photo");
      try {
        validateRoomPhoto(image);
      } catch {
        throw new Problem(400, "Choose a valid compressed JPEG product photo.");
      }
    }
  }
  const sql = b.id
    ? "UPDATE products SET name=?,sku=?,category=?,price=?,reorder=? WHERE id=? AND org_id=?"
    : "INSERT INTO products(name,sku,category,price,reorder,id,org_id) VALUES(?,?,?,?,?,?,?)";
  const statements = [
    c.env.DB.prepare(sql).bind(
      b.name,
      b.sku.toUpperCase(),
      b.category,
      b.price,
      b.reorder,
      product,
      c.get("org"),
    ),
  ];
  if (image !== undefined)
    statements.push(
      image
        ? c.env.DB.prepare("INSERT OR REPLACE INTO photos VALUES(?,?,?)").bind(
            product,
            image,
            Date.now(),
          )
        : c.env.DB.prepare("DELETE FROM photos WHERE product_id=?").bind(
            product,
          ),
    );
  await c.env.DB.batch(statements);
  return c.json({ id: product });
});
app.get("/api/photo/:id", async (c) => {
  await owned(c, "products", c.req.param("id"));
  const p = await c.env.DB.prepare("SELECT data FROM photos WHERE product_id=?")
    .bind(c.req.param("id"))
    .first<{ data: string }>();
  ensure(p, "Photo not found", 404);
  return new Response(
    Uint8Array.from(atob(p.data.split(",")[1]), (x) => x.charCodeAt(0)),
    {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    },
  );
});
app.post("/api/orders", async (c) => {
  manage(c);
  const b = await payload(
    c,
    z.object({
      productId: text(),
      locationId: text(),
      supplierId: text(),
      quantity: qty,
      reference: text(100),
    }),
  );
  await owned(c, "products", b.productId);
  await owned(c, "locations", b.locationId);
  await owned(c, "suppliers", b.supplierId);
  await c.env.DB.prepare(
    "INSERT INTO orders(id,org_id,supplier_id,product_id,location_id,quantity,reference,created_at) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      id(),
      c.get("org"),
      b.supplierId,
      b.productId,
      b.locationId,
      b.quantity,
      b.reference,
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});
app.post("/api/movements", async (c) => {
  const b = await payload(
    c,
    z.object({
      productId: text(),
      locationId: text(),
      quantity: qty,
      kind: z.enum(["adjustment", "receipt", "sale", "return"]),
      direction: z.enum(["add", "remove"]).optional(),
      reason: text(200),
      orderId: z.string().optional(),
      saleId: z.string().optional(),
      key: z.uuid(),
    }),
  );
  if (["adjustment", "receipt"].includes(b.kind)) manage(c);
  const fingerprint = await hash(JSON.stringify(b));
  const old = await c.env.DB.prepare(
    "SELECT fingerprint FROM movements WHERE org_id=? AND request_key=?",
  )
    .bind(c.get("org"), b.key)
    .first<{ fingerprint: string }>();
  if (old) {
    ensure(
      old.fingerprint === fingerprint,
      "This request key belongs to a different operation.",
      409,
    );
    return c.json({ ok: true, reused: true });
  }
  const delta =
    b.quantity *
    (b.kind === "sale" || (b.kind === "adjustment" && b.direction === "remove")
      ? -1
      : 1);
  await owned(c, "products", b.productId);
  await owned(c, "locations", b.locationId);
  if (b.kind === "receipt") ensure(b.orderId, "Choose a purchase order.");
  if (b.kind === "return") ensure(b.saleId, "Choose the original sale.");
  await c.env.DB.prepare(
    "INSERT INTO movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id(),
      c.get("org"),
      b.productId,
      b.locationId,
      delta,
      b.kind,
      b.reason,
      b.kind === "receipt" ? b.orderId : null,
      b.kind === "return" ? b.saleId : null,
      c.get("user").id,
      Date.now(),
      b.key,
      fingerprint,
    )
    .run();
  return c.json({ ok: true });
});
app.post("/api/transfers", async (c) => {
  manage(c);
  const b = await payload(
    c,
    z.object({
      id: z.uuid(),
      productId: text(),
      sourceId: text(),
      destinationId: text(),
      quantity: qty,
    }),
  );
  ensure(b.sourceId !== b.destinationId, "Choose two different locations.");
  const old = await c.env.DB.prepare(
    "SELECT * FROM transfers WHERE id=? AND org_id=?",
  )
    .bind(b.id, c.get("org"))
    .first<any>();
  if (old) {
    ensure(
      old.product_id === b.productId &&
        old.source_id === b.sourceId &&
        old.destination_id === b.destinationId &&
        old.quantity === b.quantity,
      "Transfer ID already used.",
      409,
    );
    return c.json({ ok: true });
  }
  await owned(c, "products", b.productId);
  await owned(c, "locations", b.sourceId);
  await owned(c, "locations", b.destinationId);
  await c.env.DB.prepare(
    "INSERT INTO transfers(id,org_id,product_id,source_id,destination_id,quantity,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      b.id,
      c.get("org"),
      b.productId,
      b.sourceId,
      b.destinationId,
      b.quantity,
      c.get("user").id,
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});
app.post("/api/transfers/receive", async (c) => {
  manage(c);
  const b = await payload(c, z.object({ id: text() }));
  await owned(c, "transfers", b.id);
  await c.env.DB.prepare(
    "UPDATE transfers SET status='received',received_by=?,received_at=? WHERE id=? AND org_id=? AND status='transit'",
  )
    .bind(c.get("user").id, Date.now(), b.id, c.get("org"))
    .run();
  return c.json({ ok: true });
});
app.onError((e, c) => {
  if (e instanceof Problem)
    return c.json({ error: e.message }, e.status as any);
  if (e instanceof z.ZodError)
    return c.json({ error: e.issues[0]?.message || "Check your input." }, 400);
  const message = String(e.message);
  if (/Insufficient stock|quantity>=0/.test(message))
    return c.json({ error: "Not enough stock at this location." }, 409);
  if (/Receipt exceeds|Return exceeds/.test(message))
    return c.json(
      { error: "Quantity exceeds the remaining order or original sale." },
      409,
    );
  if (/UNIQUE/.test(message))
    return c.json(
      { error: "This record already exists. Refresh before trying again." },
      409,
    );
  console.error("request_failed", { path: c.req.path, type: e.name });
  return c.json(
    { error: "Unable to complete this request. Please try again." },
    500,
  );
});
app.notFound((c) => c.json({ error: "Not found" }, 404));
export default app;
