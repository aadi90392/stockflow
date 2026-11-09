import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  Package,
  LayoutDashboard,
  MapPin,
  Truck,
  ShoppingBag,
  ArrowLeftRight,
  ClipboardList,
  Users,
  Plus,
  X,
  LogOut,
  Check,
  Menu,
  AlertTriangle,
  CheckCircle2,
  Warehouse,
} from "lucide-react";
import Landing, { Logo } from "./Landing";
import Views from "./Views";
import { api, Modal, Row, Field, ChoiceField, AddressField } from "./shared";
import { prepareRoomPhoto } from "./photo";
import "./style.css";
import "./logistics.css";
import { createRequestGuard } from "./request-guard";
const tabs = [
  ["Overview", LayoutDashboard],
  ["Products", Package],
  ["Locations", MapPin],
  ["Purchases", ShoppingBag],
  ["Transfers", ArrowLeftRight],
  ["Sales & returns", Truck],
  ["Stock ledger", ClipboardList],
  ["Suppliers", Warehouse],
  ["Team", Users],
] as const;
const titles: Record<string, [string, string]> = {
  Overview: [
    "Your stock, at a glance.",
    "See what is on hand, what is running low and what is still on the way.",
  ],
  Products: [
    "Know every product.",
    "Manage SKUs, product photos, unit costs and reorder thresholds.",
  ],
  Locations: [
    "Every location. One inventory.",
    "Add the stores and warehouses where your products are held.",
  ],
  Purchases: [
    "Order it. Receive it. Track it.",
    "Record supplier orders and receive deliveries in full or in parts.",
  ],
  Transfers: [
    "Move stock with confidence.",
    "Dispatch from one location, then confirm receiving at the destination.",
  ],
  "Sales & returns": [
    "Keep stock in step with sales.",
    "Record units sold and returns against their original sale.",
  ],
  "Stock ledger": [
    "Every movement has a story.",
    "A permanent record of what changed, where and who recorded it.",
  ],
  Suppliers: [
    "Keep your suppliers together.",
    "Store contact details for the suppliers behind your purchase orders.",
  ],
  Team: [
    "Good inventory is a team effort.",
    "Invite teammates and give each person the access they need.",
  ],
};
function App() {
  const [user, setUser] = useState<Row | null>(null),
    [ready, setReady] = useState(false),
    [auth, setAuth] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [orgs, setOrgs] = useState<Row[]>([]),
    [org, setOrg] = useState(localStorage.getItem("sf-org") || ""),
    [data, setData] = useState<Row | null>(null),
    [tab, setTabState] = useState("Overview"),
    [ledger, setLedger] = useState<Row[]>([]),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [ledgerFilter, setLedgerFilter] = useState({
      product: "",
      location: "",
      kind: "",
      q: "",
    }),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<{
      title: string;
      path: string;
      fields: Field[];
      initial: Row;
      photo: boolean;
      id: string;
    } | null>(null),
    [photo, setPhoto] = useState<string | undefined>(),
    [processing, setProcessing] = useState(false),
    [selection, setSelection] = useState<Row>({}),
    [signin, setSignin] = useState(() =>
      new URLSearchParams(location.hash.slice(1)).get("signin"),
    );
  useEffect(() => {
    if (signin) history.replaceState(null, "", location.pathname);
    api("me")
      .then((x) => setUser(x.user))
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  async function organizations(preferred?: string) {
    const list = await api("organizations");
    setOrgs(list);
    setOrg(
      preferred ||
        (list.some((x: Row) => x.id === org) ? org : list[0]?.id || ""),
    );
  }
  useEffect(() => {
    if (user) organizations().catch((e) => setError(e.message));
  }, [user]);
  const requestGuard = useRef(createRequestGuard()).current;
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  function setTab(next: string) {
    requestGuard.invalidate();
    setTabState(next);
    setPage(1);
    setLedgerFilter({ product: "", location: "", kind: "", q: "" });
    setLedger([]);
  }
  async function refresh() {
    if (!org) return;
    const version = requestGuard.begin();
    const q = "?org=" + org;
    const [d, l] = await Promise.all([
      api("dashboard" + q),
      api(
        "ledger" +
          q +
          "&page=" +
          page +
          (tab === "Sales & returns" ? "&sales=1" : "") +
          (tab === "Sales & returns" || tab === "Stock ledger"
            ? "&" + new URLSearchParams(ledgerFilter).toString()
            : ""),
      ),
    ]);
    if (!requestGuard.isCurrent(version)) return;
    setUpdatedAt(Date.now());
    setData(d);
    setLedger(l.rows);
    setMore(l.hasNext);
  }
  useEffect(() => {
    setData(null);
    localStorage.setItem("sf-org", org);
  }, [org]);
  useEffect(() => {
    if (!org || !user) return;
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => refresh().catch(() => {}), 30000);
    return () => {
      clearInterval(timer);
      requestGuard.invalidate();
    };
  }, [page, org, user, tab, ledgerFilter]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 8000);
    return () => clearTimeout(t);
  }, [message]);
  const manage = !!data && ["owner", "manager"].includes(data.role);
  const opts = (rows: Row[] | undefined) =>
    (rows || []).map((x) => ({
      value: x.id,
      label: x.name + (x.sku ? " · " + x.sku : ""),
    }));
  const productField = {
      name: "productId",
      label: "Product",
      options: opts(data?.products),
    },
    locationField = {
      name: "locationId",
      label: "Location",
      options: opts(data?.locations),
    };
  function open(
    title: string,
    path: string,
    fields: Field[],
    initial: Row = {},
    withPhoto = false,
  ) {
    setError("");
    setPhoto(undefined);
    setSelection(initial);
    setModal({
      title,
      path,
      fields,
      initial,
      photo: withPhoto,
      id: crypto.randomUUID(),
    });
  }
  function addProduct(p?: Row) {
    open(
      p ? "Edit product" : "Add a product",
      "products",
      [
        { name: "name", label: "Product name", value: p?.name },
        {
          name: "sku",
          label: "SKU / barcode",
          value: p?.sku,
          help: "A unique identifier for this product.",
        },
        {
          name: "category",
          label: "Category",
          suggestions: Array.from(
            new Set([
              "Electronics",
              "Food & beverages",
              "Clothing & apparel",
              "Home & kitchen",
              "Office supplies",
              "Health & personal care",
              "Beauty & cosmetics",
              "Tools & hardware",
              "Automotive",
              "Sports & outdoors",
              "Books & stationery",
              "Toys & games",
              "Packaging",
              "Raw materials",
              "Other",
              ...(data?.products || [])
                .map((p: Row) => p.category)
                .filter(Boolean),
            ]),
          ) as string[],
          help: "Choose a suggestion or type your own category.",
          value: p?.category,
          required: false,
        },
        {
          name: "price",
          label: "Unit cost (INR)",
          type: "money",
          value: p ? p.price / 100 : 0,
          min: 0,
        },
        {
          name: "reorder",
          label: "Low-stock threshold per stocked location",
          type: "number",
          value: p?.reorder ?? 5,
          min: 0,
        },
      ],
      p ? { id: p.id } : {},
      true,
    );
  }
  function prerequisites(twoLocations = false, supplier = false) {
    if (!data?.products.length) {
      setTab("Products");
      setMessage(
        "First add a product with its name and SKU. Then you can record stock.",
      );
      addProduct();
      return false;
    }
    if ((data?.locations.length || 0) < (twoLocations ? 2 : 1)) {
      setTab("Locations");
      setMessage(
        twoLocations
          ? "Add a second location before transferring stock."
          : "Add a location before recording stock.",
      );
      open("Add a location", "locations", [
        { name: "name", label: "Location name" },
        { name: "address", label: "Address", type: "address", required: false },
      ]);
      return false;
    }
    if (supplier && !data?.suppliers.length) {
      setTab("Suppliers");
      setMessage("Add your supplier before creating a purchase order.");
      open("Add a supplier", "suppliers", [
        { name: "name", label: "Supplier name" },
        { name: "email", label: "Email", type: "email", required: false },
        { name: "phone", label: "Phone", required: false },
      ]);
      return false;
    }
    return true;
  }
  function addOrder() {
    if (!prerequisites(false, true)) return;
    open("Create a purchase order", "orders", [
      {
        name: "reference",
        label: "Order reference",
        help: "For example, PO-2026-001",
      },
      productField,
      { ...locationField, label: "Receive into" },
      { name: "supplierId", label: "Supplier", options: opts(data?.suppliers) },
      { name: "quantity", label: "Units ordered", type: "number", min: 1 },
    ]);
  }
  function movement(kind: string, row?: Row) {
    if (!prerequisites()) return;
    const receipt = kind === "receipt",
      ret = kind === "return";
    if (ret && (row?.returnable ?? 0) <= 0) {
      setError("All units from this sale have already been returned.");
      return;
    }
    if (kind === "sale" && !data?.stock.some((s: Row) => s.quantity > 0)) {
      setError(
        "There is no stock available to sell. Receive a purchase or add opening stock first.",
      );
      return;
    }
    open(
      receipt
        ? "Receive purchase delivery"
        : ret
          ? "Record a sales return"
          : kind === "sale"
            ? "Record a sale"
            : "Adjust stock",
      "movements",
      [
        ...(receipt || ret
          ? []
          : [{ ...productField, value: row?.id }, locationField]),
        {
          name: "quantity",
          label: receipt
            ? `Units received (${row!.quantity - row!.received} remaining)`
            : ret
              ? `Units returned (${row!.returnable} remaining)`
              : "Quantity",
          type: "number",
          min: 1,
          max: receipt
            ? row!.quantity - row!.received
            : ret
              ? row!.returnable
              : undefined,
        },
        ...(kind === "adjustment"
          ? [
              {
                name: "direction",
                label: "Stock change",
                options: [
                  {
                    value: "add",
                    label: "Add units (opening stock / correction)",
                  },
                  {
                    value: "remove",
                    label: "Remove units (damage / correction)",
                  },
                ],
              },
            ]
          : []),
        {
          name: "reason",
          value:
            kind === "sale"
              ? "SALE-" + Date.now().toString(36).toUpperCase()
              : undefined,
          help:
            kind === "sale"
              ? "Keep this reference or replace it with your invoice/customer reference."
              : undefined,
          label:
            kind === "sale"
              ? "Sale reference / note"
              : "Reason / delivery reference",
        },
      ],
      {
        kind,
        ...(receipt
          ? {
              productId: row!.product_id,
              locationId: row!.location_id,
              orderId: row!.id,
            }
          : ret
            ? {
                productId: row!.product_id,
                locationId: row!.location_id,
                saleId: row!.id,
                returnable: row!.returnable,
                saleReference: row!.reason,
              }
            : {}),
      },
    );
  }
  function transfer() {
    if (!prerequisites(true)) return;
    open("Dispatch a stock transfer", "transfers", [
      productField,
      { ...locationField, name: "sourceId", label: "From location" },
      { ...locationField, name: "destinationId", label: "To location" },
      { name: "quantity", label: "Units to transfer", type: "number", min: 1 },
    ]);
  }
  async function action(path: string, body: Row) {
    setBusy(true);
    setError("");
    try {
      await api(path + "?org=" + org, body);
      await refresh();
      setMessage("Changes saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await api("auth/logout", {});
    setUser(null);
    setData(null);
    setOrg("");
    setOrgs([]);
    setLedger([]);
  }
  const orgName = orgs.find((x) => x.id === org)?.name || "Your workspace";
  const primary = () =>
    tab === "Products"
      ? addProduct()
      : tab === "Locations"
        ? open("Add a location", "locations", [
            { name: "name", label: "Location name" },
            {
              name: "address",
              label: "Address",
              type: "address",
              required: false,
            },
          ])
        : tab === "Purchases"
          ? addOrder()
          : tab === "Transfers"
            ? transfer()
            : tab === "Suppliers"
              ? open("Add a supplier", "suppliers", [
                  { name: "name", label: "Supplier name" },
                  {
                    name: "email",
                    label: "Email",
                    type: "email",
                    required: false,
                  },
                  { name: "phone", label: "Phone", required: false },
                ])
              : movement("adjustment");
  return (
    <>
      {!ready ? (
        <div className="loading">
          <Logo />
          <p>Opening your workspace…</p>
        </div>
      ) : !user ? (
        <Landing
          start={() => {
            setAuth(true);
            setError("");
          }}
        />
      ) : !org ? (
        <div className="onboarding">
          <Logo />
          <span className="eyebrow">LET'S GET YOUR INVENTORY ORGANIZED</span>
          <h1>
            Where does your
            <br />
            stock story begin?
          </h1>
          <p>
            Create a workspace for your business, or join your team with an
            invitation code.
          </p>
          <div className="button-row">
            <button
              className="btn green"
              onClick={() =>
                open("Create your workspace", "organizations", [
                  { name: "name", label: "Business / workspace name" },
                ])
              }
            >
              Create workspace <Plus size={17} />
            </button>
            <button
              className="btn outline"
              onClick={() =>
                open("Join your team", "join", [
                  { name: "code", label: "Private invitation code" },
                ])
              }
            >
              Join a team
            </button>
          </div>
          <button className="text-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="app-shell">
          <aside className={mobile ? "sidebar visible" : "sidebar"}>
            <Logo />
            <button
              className="workspace-button"
              onClick={() =>
                open("Create another workspace", "organizations", [
                  { name: "name", label: "New workspace name" },
                ])
              }
            >
              <span className="workspace-avatar">{orgName[0]}</span>
              <span>
                <b>{orgName}</b>
                <small>{data?.role || "Workspace"}</small>
              </span>
              <Plus size={15} />
            </button>
            {orgs.length > 1 && (
              <select
                aria-label="Switch workspace"
                value={org}
                onChange={(e) => {
                  setPage(1);
                  setOrg(e.target.value);
                }}
              >
                {orgs.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            )}
            <span className="nav-caption">WORKSPACE</span>
            <nav>
              {tabs.map(([name, Icon]) => (
                <button
                  key={name}
                  className={tab === name ? "active" : ""}
                  onClick={() => {
                    setTab(name);
                    setPage(1);
                    setMobile(false);
                  }}
                >
                  <Icon size={19} />
                  {name}
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              <Package size={28} />
              <h3>A place for every item.</h3>
              <p>A record for every move.</p>
              <button
                onClick={() =>
                  open("Join another workspace", "join", [
                    { name: "code", label: "Invitation code" },
                  ])
                }
              >
                Join a workspace <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="account">
              <span className="avatar">
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b>{user.name}</b>
                <small>{user.email}</small>
              </div>
              <button title="Sign out" onClick={logout}>
                <LogOut size={18} />
              </button>
            </div>
          </aside>
          <main className="main">
            <header className="app-topbar">
              <button
                className="mobile-toggle"
                aria-label="Toggle navigation"
                onClick={() => setMobile(!mobile)}
              >
                <Menu />
              </button>
              <span>
                Workspace <span className="muted">/</span> <b>{tab}</b>
              </span>
              <div className="top-date">
                <span className="small-dot" />{" "}
                {new Date().toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </header>
            <div className="main-content">
              <div className="toolbar">
                <span className="fine">
                  {updatedAt
                    ? "Updated " + new Date(updatedAt).toLocaleTimeString()
                    : "Loading latest inventory"}{" "}
                  · Refreshes every 30 seconds
                </span>
                <button
                  className="text-btn"
                  onClick={() => refresh().catch((e) => setError(e.message))}
                >
                  Refresh now ↻
                </button>
              </div>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">{orgName.toUpperCase()}</span>
                  <h1>{titles[tab][0]}</h1>
                  <p>{titles[tab][1]}</p>
                </div>
                {manage && tab !== "Team" && tab !== "Sales & returns" && (
                  <button className="btn green" onClick={primary}>
                    <Plus size={17} />
                    {tab === "Products"
                      ? "Add product"
                      : tab === "Locations"
                        ? "Add location"
                        : tab === "Purchases"
                          ? "Purchase order"
                          : tab === "Transfers"
                            ? "Transfer stock"
                            : tab === "Suppliers"
                              ? "Add supplier"
                              : "Adjust stock"}
                  </button>
                )}
              </div>
              {!data ? (
                <div className="loading">Loading inventory…</div>
              ) : (
                <>
                  {(tab === "Stock ledger" || tab === "Sales & returns") && (
                    <div className="ledger-filters">
                      <label>
                        Search reference / product
                        <input
                          aria-label="Search ledger"
                          value={ledgerFilter.q}
                          placeholder="Search all matching movements…"
                          onChange={(e) => {
                            setLedgerFilter({
                              ...ledgerFilter,
                              q: e.target.value,
                            });
                            setPage(1);
                          }}
                        />
                      </label>
                      {(["product", "location", "kind"] as const).map((key) => (
                        <label key={key}>
                          {key === "kind"
                            ? "Movement type"
                            : key === "product"
                              ? "Product"
                              : "Location"}
                          <select
                            aria-label={"Filter ledger " + key}
                            value={ledgerFilter[key]}
                            onChange={(e) => {
                              setLedgerFilter({
                                ...ledgerFilter,
                                [key]: e.target.value,
                              });
                              setPage(1);
                            }}
                          >
                            <option value="">All</option>
                            {key === "kind"
                              ? (tab === "Sales & returns"
                                  ? ["sale", "return"]
                                  : [
                                      "adjustment",
                                      "receipt",
                                      "sale",
                                      "return",
                                      "transfer_out",
                                      "transfer_in",
                                    ]
                                ).map((x) => (
                                  <option key={x} value={x}>
                                    {x.replaceAll("_", " ")}
                                  </option>
                                ))
                              : (key === "product"
                                  ? data.products
                                  : data.locations
                                ).map((x: Row) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name}
                                  </option>
                                ))}
                          </select>
                        </label>
                      ))}
                      <button
                        className="text-btn"
                        onClick={() => {
                          setLedgerFilter({
                            product: "",
                            location: "",
                            kind: "",
                            q: "",
                          });
                          setPage(1);
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                  <Views
                    data={data}
                    tab={tab}
                    setTab={setTab}
                    org={org}
                    user={user}
                    ledger={ledger}
                    page={page}
                    setPage={setPage}
                    more={more}
                    manage={manage}
                    busy={busy}
                    addProduct={addProduct}
                    addOrder={addOrder}
                    movement={movement}
                    transfer={transfer}
                    action={action}
                    notice={setMessage}
                    error={setError}
                  />
                </>
              )}
            </div>
            <footer className="app-footer">
              <span>StockFlow · Clear stock. Smoother days.</span>
              <span>
                Inventory values are estimates, not accounting statements.
              </span>
            </footer>
          </main>
        </div>
      )}
      {auth && (
        <Modal title="Your inventory starts here." close={() => setAuth(false)}>
          <p className="muted">
            We'll email a secure sign-in link—no password to remember.
          </p>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await api(
                  "auth/link",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                setMessage(r.message);
                setAuth(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Your name
              <input name="name" required maxLength={60} autoComplete="name" />
            </label>
            <label>
              Email address
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <button disabled={busy} className="btn green">
              {busy ? "Sending link…" : "Email me a sign-in link"}
              <ArrowRight size={17} />
            </button>
            <p className="fine">
              The link expires in 15 minutes and works once. Check spam if it
              doesn't arrive.
            </p>
          </form>
        </Modal>
      )}
      {signin && (
        <Modal title="Welcome to StockFlow." close={() => setSignin(null)}>
          <p>Confirm sign-in to open your inventory workspace.</p>
          <button
            className="btn green"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await api("auth/verify", { token: signin });
                setUser(r.user);
                setSignin(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Continue securely <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal && (
        <Modal
          title={modal.title}
          close={() => {
            if (!busy && !processing) setModal(null);
          }}
        >
          <form
            className="form"
            onChange={(e) =>
              setSelection({
                ...modal.initial,
                ...Object.fromEntries(new FormData(e.currentTarget)),
              })
            }
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const fields = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                if (modal.path === "products")
                  fields.price = String(Math.round(Number(fields.price) * 100));
                const body = {
                  ...modal.initial,
                  ...fields,
                  ...(modal.path === "movements"
                    ? { key: modal.id }
                    : modal.path === "transfers"
                      ? { id: modal.id }
                      : {}),
                  ...(photo !== undefined ? { photo } : {}),
                };
                requestGuard.invalidate();
                const r = await api(modal.path + "?org=" + org, body);
                if (["organizations", "join"].includes(modal.path))
                  await organizations(r.id);
                else await refresh();
                setModal(null);
                setMessage(
                  modal.initial.kind === "sale"
                    ? "Sale saved. Stock has been deducted."
                    : modal.initial.kind === "return"
                      ? "Return saved. Units are back in stock."
                      : "Saved successfully.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {modal.initial.kind === "return" && (
              <div className="info-strip">
                <span>
                  Original sale: <b>{modal.initial.saleReference}</b>
                  <br />
                  {modal.initial.returnable} units can still be returned.
                  Returned units go back to the original location.
                </span>
              </div>
            )}
            {["movements", "transfers"].includes(modal.path) && (
              <div className="info-strip">
                <span>
                  {selection.productId &&
                  (selection.locationId || selection.sourceId) ? (
                    <>
                      <b>
                        {
                          data?.products.find(
                            (p: Row) => p.id === selection.productId,
                          )?.name
                        }
                      </b>{" "}
                      ·{" "}
                      {data?.stock.find(
                        (s: Row) =>
                          s.product_id === selection.productId &&
                          s.location_id ===
                            (selection.locationId || selection.sourceId),
                      )?.quantity || 0}{" "}
                      units available at this location.
                    </>
                  ) : (
                    "Select a product and source location to see available stock."
                  )}
                </span>
              </div>
            )}
            {modal.photo && (
              <div className="photo-editor">
                {photo ? (
                  <img src={photo} alt="Product preview" />
                ) : photo !== "" &&
                  modal.initial.id &&
                  data?.products.find((p: Row) => p.id === modal.initial.id)
                    ?.photo ? (
                  <img
                    src={"/api/photo/" + modal.initial.id + "?org=" + org}
                    alt="Current product"
                  />
                ) : (
                  <div className="photo-empty">
                    <Package size={36} />
                    <span>Add a product photo</span>
                  </div>
                )}
                <label>
                  Product photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={processing || busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setProcessing(true);
                      try {
                        setPhoto(await prepareRoomPhoto(file));
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setProcessing(false);
                      }
                    }}
                  />
                </label>
                <small>
                  JPG, PNG or WebP, up to 10 MB. Compressed automatically.
                </small>
                <button
                  type="button"
                  className="text-btn"
                  disabled={busy || processing}
                  onClick={() => setPhoto("")}
                >
                  Remove photo
                </button>
              </div>
            )}
            {modal.fields.map((f) => (
              <div className="form-field" key={f.name}>
                {f.label}
                {f.options ? (
                  <ChoiceField field={f} />
                ) : f.type === "address" ? (
                  <AddressField />
                ) : (
                  <input
                    list={f.suggestions ? "suggestions-" + f.name : undefined}
                    aria-label={f.label}
                    name={f.name}
                    type={f.type === "money" ? "number" : f.type || "text"}
                    step={
                      f.type === "money"
                        ? "0.01"
                        : f.type === "number"
                          ? "1"
                          : undefined
                    }
                    min={f.min}
                    max={
                      f.name === "quantity" &&
                      (modal.initial.kind === "sale" ||
                        modal.path === "transfers" ||
                        (modal.initial.kind === "adjustment" &&
                          selection.direction === "remove")) &&
                      selection.productId &&
                      (selection.locationId || selection.sourceId)
                        ? data?.stock.find(
                            (s: Row) =>
                              s.product_id === selection.productId &&
                              s.location_id ===
                                (selection.locationId || selection.sourceId),
                          )?.quantity || 0
                        : f.max
                    }
                    maxLength={200}
                    required={f.required !== false}
                    defaultValue={f.value}
                  />
                )}{" "}
                {f.suggestions && (
                  <datalist id={"suggestions-" + f.name}>
                    {f.suggestions.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                )}
                {f.help && <small>{f.help}</small>}
              </div>
            ))}
            <button className="btn green" disabled={busy || processing}>
              {processing
                ? "Preparing photo…"
                : busy
                  ? "Saving…"
                  : "Save changes"}
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
      {error && (
        <div className="toast error" role="alert">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {message && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <span>{message}</span>
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
