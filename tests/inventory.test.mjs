import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../migrations/0001_inventory.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(
    `INSERT INTO users VALUES('u','test@example.test','Tester',1); INSERT INTO organizations VALUES('o','Test','invite'),('other','Other','other-invite'); INSERT INTO locations VALUES('a','o','A',''),('b','o','B',''),('x','other','X',''); INSERT INTO products VALUES('p','o','SKU','Product','',100,5,1); INSERT INTO suppliers VALUES('s','o','Supplier','','');`,
  );
  return db;
}
function move(
  db,
  id,
  delta,
  kind = "adjustment",
  order = null,
  sale = null,
  location = "a",
) {
  db.prepare("INSERT INTO movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id,
    "o",
    "p",
    location,
    delta,
    kind,
    "Test operation",
    order,
    sale,
    "u",
    1,
    id,
    id,
  );
}
const balance = (db, location = "a") =>
  db
    .prepare("SELECT quantity FROM stock WHERE product_id=? AND location_id=?")
    .get("p", location)?.quantity || 0;
test("overselling rolls back balance and ledger together", () => {
  const db = fixture();
  move(db, "opening", 10);
  assert.throws(() => move(db, "oversell", -11, "sale"), /Insufficient/);
  assert.equal(balance(db), 10);
  assert.equal(db.prepare("SELECT count(*) n FROM movements").get().n, 1);
  move(db, "sale", -10, "sale");
  assert.equal(balance(db), 0);
  db.close();
});
test("partial receipts cannot exceed purchase order quantity", () => {
  const db = fixture();
  db.exec("INSERT INTO orders VALUES('po','o','s','p','a',10,0,'PO-1',1)");
  move(db, "receipt1", 6, "receipt", "po");
  assert.throws(
    () => move(db, "receipt2", 5, "receipt", "po"),
    /Receipt exceeds/,
  );
  move(db, "receipt3", 4, "receipt", "po");
  assert.equal(balance(db), 10);
  assert.equal(db.prepare("SELECT received FROM orders").get().received, 10);
  db.close();
});
test("returns cannot exceed the original sale", () => {
  const db = fixture();
  move(db, "opening", 10);
  move(db, "sale", -4, "sale");
  move(db, "return1", 3, "return", null, "sale");
  assert.throws(
    () => move(db, "return2", 2, "return", null, "sale"),
    /Return exceeds/,
  );
  assert.equal(balance(db), 9);
  db.close();
});
test("transfers deduct on dispatch and credit only once on receive", () => {
  const db = fixture();
  move(db, "opening", 10);
  db.exec(
    "INSERT INTO transfers(id,org_id,product_id,source_id,destination_id,quantity,created_by,created_at) VALUES('t','o','p','a','b',4,'u',1)",
  );
  assert.equal(balance(db), 6);
  assert.equal(balance(db, "b"), 0);
  db.exec(
    "UPDATE transfers SET status='received',received_by='u',received_at=2 WHERE id='t'",
  );
  db.exec("UPDATE transfers SET status='received' WHERE id='t'");
  assert.equal(balance(db, "b"), 4);
  assert.equal(db.prepare("SELECT count(*) n FROM movements").get().n, 3);
  db.close();
});
test("cross-organization movements and duplicate operations are rejected", () => {
  const db = fixture();
  assert.throws(
    () => move(db, "cross", 5, "adjustment", null, null, "x"),
    /membership/,
  );
  move(db, "same", 10);
  assert.throws(() => move(db, "same", 10), /UNIQUE/);
  assert.equal(balance(db), 10);
  db.close();
});
test("ledger cannot be edited or deleted", () => {
  const db = fixture();
  move(db, "opening", 10);
  assert.throws(() => db.exec("UPDATE movements SET delta=20"), /immutable/);
  assert.throws(() => db.exec("DELETE FROM movements"), /immutable/);
  assert.equal(balance(db), 10);
  db.close();
});
