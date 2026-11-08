import { useState, useEffect } from "react";
import {
  Package,
  Boxes,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  ArrowLeftRight,
  MapPin,
  Warehouse,
  Search,
  ShoppingBag,
  Plus,
  Download,
} from "lucide-react";
import { Row, Empty, money, date, api, exportCsv } from "./shared";
type Props = {
  data: Row;
  tab: string;
  setTab: (s: string) => void;
  org: string;
  user: Row;
  ledger: Row[];
  page: number;
  setPage: (n: number) => void;
  more: boolean;
  manage: boolean;
  busy: boolean;
  addProduct: (p?: Row) => void;
  addOrder: () => void;
  movement: (kind: string, row?: Row) => void;
  transfer: () => void;
  action: (path: string, body: Row) => Promise<void>;
  notice: (s: string) => void;
  error: (s: string) => void;
};
export default function Views({
  data,
  tab,
  setTab,
  org,
  user,
  ledger,
  page,
  setPage,
  more,
  manage,
  busy,
  addProduct,
  addOrder,
  movement,
  transfer,
  action,
  notice,
  error,
}: Props) {
  const [search, setSearch] = useState(""),
    [invite, setInvite] = useState("");
  useEffect(() => {
    setSearch("");
    setInvite("");
  }, [tab, org]);
  const low = data.stock.filter((s: Row) => s.quantity <= s.reorder),
    pending = data.orders.filter((o: Row) => o.received < o.quantity),
    transit = data.transfers.filter((t: Row) => t.status === "transit"),
    products = data.products.filter((p: Row) =>
      (p.name + " " + p.sku + " " + p.category)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  if (tab === "Overview")
    return (
      <>
        <div className="dashboard-banner">
          <div>
            <span className="eyebrow">A CLEARER VIEW OF YOUR BUSINESS</span>
            <h2>
              Everything in its place.
              <br />
              Every movement accounted for.
            </h2>
            <p>
              {data.products.length
                ? "Your latest stock balances are ready. Check low-stock items and outstanding deliveries below."
                : "Start by adding a location and your first product. Then record opening stock or receive a purchase order."}
            </p>
            <button
              className="btn yellow"
              onClick={() =>
                setTab(data.locations.length ? "Products" : "Locations")
              }
            >
              {data.products.length ? "View products" : "Set up your inventory"}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <img src="/warehouse.jpg" alt="Inventory stored in a warehouse" />
        </div>
        <div className="stats">
          {[
            [
              Package,
              "Units on hand",
              data.products.reduce((n: number, p: Row) => n + p.quantity, 0),
              "Across " + data.locations.length + " locations",
            ],
            [
              Boxes,
              "Inventory value",
              money(
                data.products.reduce(
                  (n: number, p: Row) => n + p.quantity * p.price,
                  0,
                ),
              ),
              "Based on current unit costs",
            ],
            [
              AlertTriangle,
              "Low-stock positions",
              low.length,
              "At or below their threshold",
            ],
            [
              Truck,
              "Open purchase orders",
              pending.length,
              "Waiting for full delivery",
            ],
          ].map(([Icon, label, value, hint]: any) => (
            <div className="stat" key={label}>
              <div>
                {label}
                <Icon size={18} />
              </div>
              <strong>{value}</strong>
              <small>{hint}</small>
            </div>
          ))}
        </div>
        <div className="two-panels">
          <section className="panel">
            <div className="panel-title">
              <h3>Stock that needs attention</h3>
              <button className="text-btn" onClick={() => setTab("Products")}>
                All products <ArrowUpRight size={15} />
              </button>
            </div>
            {low.length ? (
              <div className="compact-list">
                {low.slice(0, 5).map((s: Row) => (
                  <div key={s.product_id + s.location_id}>
                    <span className="item-icon">
                      <Package size={20} />
                    </span>
                    <div>
                      <b>{s.name}</b>
                      <small>{s.location}</small>
                    </div>
                    <span className="badge amber">{s.quantity} left</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  data.products.length
                    ? "No low-stock alerts"
                    : "No products tracked yet"
                }
                detail={
                  data.products.length
                    ? "Stocked locations are above their reorder thresholds."
                    : "Add products and record their opening quantities."
                }
              />
            )}
          </section>
          <section className="panel">
            <div className="panel-title">
              <h3>Recent stock movements</h3>
              <button
                className="text-btn"
                onClick={() => setTab("Stock ledger")}
              >
                View ledger <ArrowUpRight size={15} />
              </button>
            </div>
            {ledger.length ? (
              <div className="compact-list">
                {ledger.slice(0, 5).map((r) => (
                  <div key={r.id}>
                    <span className="item-icon">
                      <ArrowLeftRight size={19} />
                    </span>
                    <div>
                      <b>{r.product}</b>
                      <small>
                        {r.kind.replaceAll("_", " ")} · {r.location}
                      </small>
                    </div>
                    <strong className={r.delta > 0 ? "positive" : "negative"}>
                      {r.delta > 0 ? "+" : ""}
                      {r.delta}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Your ledger starts here"
                detail="Every receipt, sale and transfer will appear here."
              />
            )}
          </section>
        </div>
      </>
    );
  if (tab === "Products")
    return (
      <>
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Search products"
              placeholder="Search by product, SKU or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="muted">{products.length} products</span>
        </div>
        {products.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>On hand</th>
                  <th>Unit cost</th>
                  <th>Reorder level</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p: Row) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        {p.photo ? (
                          <img
                            src={
                              "/api/photo/" +
                              p.id +
                              "?org=" +
                              org +
                              "&v=" +
                              p.photo
                            }
                            alt=""
                          />
                        ) : (
                          <span className="product-placeholder">
                            <Package />
                          </span>
                        )}
                        <b>{p.name}</b>
                      </div>
                    </td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.category || "—"}</td>
                    <td>
                      <b>{p.quantity}</b> units
                    </td>
                    <td>{money(p.price)}</td>
                    <td>{p.reorder}</td>
                    <td>
                      {manage && (
                        <button
                          className="text-btn"
                          onClick={() => addProduct(p)}
                        >
                          Edit <ArrowUpRight size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your shelves start with a product."
            detail="Add a product name, SKU and unit cost. Stock quantities are recorded separately."
            button={manage ? "Add your first product" : undefined}
            action={() => addProduct()}
          />
        )}
        <h3 className="subheading">Stock by location</h3>
        {data.stock.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Location</th>
                  <th>Available units</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.stock
                  .filter((s: Row) =>
                    (s.name + " " + s.sku)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((s: Row) => (
                    <tr key={s.product_id + s.location_id}>
                      <td>{s.name}</td>
                      <td>{s.location}</td>
                      <td>{s.quantity}</td>
                      <td>
                        <span
                          className={
                            "badge " +
                            (s.quantity <= s.reorder ? "amber" : "green-badge")
                          }
                        >
                          {s.quantity <= s.reorder ? "Low stock" : "In stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="note">
            Add opening quantities with “Adjust stock” on Overview, or receive a
            purchase order.
          </p>
        )}
      </>
    );
  if (tab === "Locations")
    return (
      <div className="location-grid">
        {data.locations.length ? (
          data.locations.map((l: Row) => (
            <article className="location-card" key={l.id}>
              <span className="location-icon">
                <Warehouse size={34} />
              </span>
              <span className="eyebrow">STOCK LOCATION</span>
              <h3>{l.name}</h3>
              <p>
                <MapPin size={15} />
                {l.address || "No address added"}
              </p>
              <div>
                <b>
                  {data.stock
                    .filter((s: Row) => s.location_id === l.id)
                    .reduce((n: number, s: Row) => n + s.quantity, 0)}
                </b>{" "}
                units on hand
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Where do you keep your stock?"
            detail="Add your first store or warehouse to start tracking quantities."
          />
        )}
      </div>
    );
  if (tab === "Suppliers")
    return data.suppliers.length ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {data.suppliers.map((s: Row) => (
              <tr key={s.id}>
                <td>
                  <b>{s.name}</b>
                </td>
                <td>{s.email || "—"}</td>
                <td>{s.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title="Add the people you buy from."
        detail="Supplier details connect each purchase order to its source."
      />
    );
  if (tab === "Purchases")
    return (
      <>
        <div className="info-strip">
          <ShoppingBag size={20} />
          <span>
            <b>{pending.length} orders awaiting delivery.</b> Receiving stock
            updates the location balance and ledger together.
          </span>
        </div>
        {data.orders.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference / supplier</th>
                  <th>Product</th>
                  <th>Receive into</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o: Row) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.reference}</b>
                      <small>{o.supplier}</small>
                    </td>
                    <td>{o.product}</td>
                    <td>{o.location}</td>
                    <td>
                      {o.received} / {o.quantity}
                    </td>
                    <td>
                      <span
                        className={
                          "badge " +
                          (o.received === o.quantity ? "green-badge" : "amber")
                        }
                      >
                        {o.received === o.quantity
                          ? "Received"
                          : o.received
                            ? "Part received"
                            : "Awaiting delivery"}
                      </span>
                    </td>
                    <td>
                      {manage && o.received < o.quantity && (
                        <button
                          className="btn small outline"
                          onClick={() => movement("receipt", o)}
                        >
                          Receive stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your next delivery starts here."
            detail="Add a product, location and supplier, then create a purchase order."
            button={manage ? "Create purchase order" : undefined}
            action={addOrder}
          />
        )}
        <p className="fine">Showing the latest 200 purchase orders.</p>
      </>
    );
  if (tab === "Transfers")
    return (
      <>
        <div className="info-strip">
          <Truck size={20} />
          <span>
            <b>{transit.length} transfers in transit.</b> Dispatched stock is
            only added to the destination after receiving is confirmed.
          </span>
        </div>
        {data.transfers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>From → To</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.transfers.map((t: Row) => (
                  <tr key={t.id}>
                    <td>
                      <b>{t.product}</b>
                      <small>{date(t.created_at)}</small>
                    </td>
                    <td>
                      {t.source} → {t.destination}
                    </td>
                    <td>{t.quantity}</td>
                    <td>
                      <span
                        className={
                          "badge " +
                          (t.status === "received" ? "green-badge" : "amber")
                        }
                      >
                        {t.status === "received" ? "Received" : "In transit"}
                      </span>
                    </td>
                    <td>
                      {manage && t.status === "transit" && (
                        <button
                          disabled={busy}
                          className="btn small outline"
                          onClick={() => {
                            if (
                              confirm(
                                "Confirm these units have arrived at " +
                                  t.destination +
                                  "?",
                              )
                            )
                              action("transfers/receive", { id: t.id });
                          }}
                        >
                          Confirm receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Move stock between your locations."
            detail="Create at least two locations, then dispatch available units."
            button={manage ? "Transfer stock" : undefined}
            action={transfer}
          />
        )}
        <p className="fine">Showing the latest 200 transfers.</p>
      </>
    );
  if (tab === "Stock ledger" || tab === "Sales & returns")
    return (
      <>
        <div className="toolbar">
          <span className="muted">Latest first · 50 movements per page</span>
          <div className="button-row">
            {tab === "Sales & returns" && (
              <button className="btn green" onClick={() => movement("sale")}>
                Record sale <Plus size={16} />
              </button>
            )}
            <button
              className="btn outline"
              disabled={!ledger.length}
              onClick={() => exportCsv(ledger, page)}
            >
              <Download size={16} />
              Export this page
            </button>
          </div>
        </div>
        {ledger.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product / date</th>
                  <th>Location</th>
                  <th>Movement</th>
                  <th>Units</th>
                  <th>Recorded by</th>
                  <th>Reason</th>
                  {tab === "Sales & returns" && <th />}
                </tr>
              </thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.product}</b>
                      <small>{date(r.created_at)}</small>
                    </td>
                    <td>{r.location}</td>
                    <td>
                      <span className="badge">
                        {r.kind.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className={r.delta > 0 ? "positive" : "negative"}>
                      {r.delta > 0 ? "+" : ""}
                      {r.delta}
                    </td>
                    <td>{r.actor}</td>
                    <td>{r.reason}</td>
                    {tab === "Sales & returns" && (
                      <td>
                        {r.kind === "sale" && (
                          <button
                            className="text-btn"
                            onClick={() => movement("return", r)}
                          >
                            Return units
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No movements recorded yet."
            detail="Receive stock or add an opening quantity to begin your ledger."
          />
        )}
        <div className="pagination">
          <button
            className="btn outline small"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="btn outline small"
            disabled={!more}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </>
    );
  if (tab === "Team")
    return (
      <>
        {manage && (
          <div className="invite-panel">
            <div>
              <h3>Bring your team into the picture.</h3>
              <p>
                Share a private invitation code. New teammates join as staff.
              </p>
              {invite && <code>{invite}</code>}
            </div>
            <div className="button-row">
              <button
                className="btn green"
                onClick={async () => {
                  try {
                    const x = await api("invite?org=" + org);
                    setInvite(x.invite);
                    await navigator.clipboard.writeText(x.invite);
                    notice("Invitation code copied. Share it privately.");
                  } catch (e) {
                    error((e as Error).message);
                  }
                }}
              >
                Copy invite code
              </button>
              {data.role === "owner" && (
                <button
                  className="btn outline"
                  onClick={async () => {
                    if (
                      confirm(
                        "Replace the invitation code? The old code will stop working.",
                      )
                    ) {
                      await action("invite/rotate", {});
                      setInvite("");
                    }
                  }}
                >
                  Rotate code
                </button>
              )}
            </div>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teammate</th>
                <th>Email</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.members.map((m: Row) => (
                <tr key={m.id}>
                  <td>
                    <b>{m.name}</b>
                    {m.id === user.id && <small>You</small>}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    <span className="badge">{m.role}</span>
                  </td>
                  <td>
                    {data.role === "owner" && m.role !== "owner" && (
                      <select
                        aria-label={"Change role for " + m.name}
                        value={m.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          if (
                            role !== "remove" ||
                            confirm(
                              "Remove " + m.name + " from this workspace?",
                            )
                          )
                            action("members", { userId: m.id, role });
                        }}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="remove">Remove member</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Managers manage inventory and purchasing. Staff view inventory, record
          sales and return sold units. Only owners can change roles or remove
          teammates.
        </p>
      </>
    );
  return null;
}
