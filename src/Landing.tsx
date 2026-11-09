import {
  ArrowUpRight,
  ArrowRight,
  Package,
  Boxes,
  Check,
  Warehouse,
  ArrowLeftRight,
  ShieldCheck,
  Truck,
  Users,
  Plus,
  ShoppingBag as ShoppingBagIcon,
} from "lucide-react";
export function Logo() {
  return (
    <a className="logo" href="/">
      <span>
        <Boxes size={26} />
      </span>
      stockflow<span className="logo-dot">.</span>
    </a>
  );
}
export default function Landing({ start }: { start: () => void }) {
  return (
    <div className="landing">
      <div className="brand-strip">
        <span>
          <b>STOCKFLOW</b> / Inventory & warehouse operations
        </span>
        <span>Products. People. Every movement connected.</span>
      </div>
      <nav className="public-nav">
        <Logo />
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#questions">Questions</a>
        </div>
        <button className="btn green" onClick={start}>
          Open your workspace <ArrowUpRight size={16} />
        </button>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="small-dot" /> INVENTORY, WITHOUT THE GUESSWORK
          </span>
          <h1>
            Your inventory.
            <br />
            Always <em>under control.</em>
          </h1>
          <p>
            Track products across your stores and warehouses. Receive purchases,
            record sales and move stock—all in one clear workspace.
          </p>
          <button className="btn green large" onClick={start}>
            Start managing your stock <ArrowUpRight size={18} />
          </button>
          <div className="hero-checks">
            <span>
              <Check size={16} /> Know what's available
            </span>
            <span>
              <Check size={16} /> Trace every stock change
            </span>
            <span>
              <Check size={16} /> Keep your team in sync
            </span>
          </div>
        </div>
        <div className="operations-board">
          <div className="board-heading">
            <span className="eyebrow">THE STOCKFLOW WORKFLOW</span>
            <Boxes size={21} />
          </div>
          <h3>
            From incoming stock
            <br />
            to your next sale.
          </h3>
          <div className="flow-route">
            {[
              [
                ShoppingBagIcon,
                "01",
                "Purchase & receive",
                "Log deliveries. Track what is still due.",
              ],
              [
                Warehouse,
                "02",
                "Store & transfer",
                "Know where every unit belongs.",
              ],
              [
                Package,
                "03",
                "Sell & return",
                "Keep stock aligned with every change.",
              ],
            ].map(([Icon, n, title, description]: any) => (
              <div className="route-step" key={n}>
                <span className="route-icon">
                  <Icon size={22} />
                </span>
                <section>
                  <small>STEP {n}</small>
                  <b>{title}</b>
                  <p>{description}</p>
                </section>
                <ArrowUpRight size={15} />
              </div>
            ))}
          </div>
          <div className="board-footer">
            <ShieldCheck size={19} />
            <span>Every movement. One traceable ledger.</span>
          </div>
        </div>
      </section>
      <div className="workflow-strip">
        <span>BUILT FOR YOUR DAILY OPERATIONS</span>
        <b>Purchase</b>
        <ArrowRight />
        <b>Receive</b>
        <ArrowRight />
        <b>Store</b>
        <ArrowRight />
        <b>Sell & transfer</b>
      </div>
      <section className="section" id="how">
        <div className="section-heading">
          <span className="eyebrow">A SIMPLE WAY TO STAY ORGANIZED</span>
          <h2>
            Less checking spreadsheets.
            <br />
            More knowing what comes next.
          </h2>
          <p>
            Start with your real products and locations. StockFlow keeps the
            movement history as your team works.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [
              Package,
              "01",
              "Add your products",
              "Give each item a SKU, photo, unit cost and reorder level.",
            ],
            [
              Warehouse,
              "02",
              "Set up your locations",
              "Keep separate stock counts for each store and warehouse.",
            ],
            [
              ArrowLeftRight,
              "03",
              "Record every movement",
              "Receive deliveries, record sales and confirm transfers.",
            ],
          ].map(([Icon, n, title, desc]: any) => (
            <article className="feature-card" key={n}>
              <div>
                <Icon size={28} />
                <span>{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <button className="text-btn" onClick={start}>
                Get started <ArrowUpRight size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="green-panel" id="features">
        <div>
          <span className="eyebrow">CONFIDENCE IN EVERY COUNT</span>
          <h2>
            One stock ledger.
            <br />A complete picture.
          </h2>
          <p>
            See what changed, where it happened and who recorded it. Partial
            deliveries and stock in transit stay visible until the work is
            finished.
          </p>
          <button className="btn yellow" onClick={start}>
            Create your workspace <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="benefits">
          {[
            [
              ShieldCheck,
              "Stock you can trust",
              "Checks prevent stock from dropping below zero.",
            ],
            [
              Truck,
              "Receiving that matches reality",
              "Receive part of an order and track what is still due.",
            ],
            [
              Users,
              "The right access for your team",
              "Owners and managers control inventory; staff record sales and returns.",
            ],
          ].map(([Icon, title, desc]: any) => (
            <div key={title}>
              <Icon size={23} />
              <section>
                <h3>{title}</h3>
                <p>{desc}</p>
              </section>
            </div>
          ))}
        </div>
      </section>
      <section className="section faq" id="questions">
        <div>
          <span className="eyebrow">BEFORE YOU GET STARTED</span>
          <h2>A few useful answers.</h2>
        </div>
        <div>
          {[
            [
              "What does StockFlow manage?",
              "Products, location-level stock, suppliers, purchase orders, transfers, sales, returns and the inventory movement ledger.",
            ],
            [
              "Will my workspace contain sample stock?",
              "No. Your workspace starts empty. Add your own locations, products and opening stock.",
            ],
            [
              "Can my team work together?",
              "Yes. Share a private invitation code and assign manager or staff access. Each person signs in with their own email.",
            ],
            [
              "Is this accounting or checkout software?",
              "No. StockFlow records inventory movements and unit-cost estimates. It does not process payments, calculate taxes or replace accounting software.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={16} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <footer>
        <Logo />
        <span>Clear stock. Smoother days.</span>
        <button className="text-btn" onClick={start}>
          Open workspace <ArrowUpRight size={16} />
        </button>
      </footer>
    </div>
  );
}
