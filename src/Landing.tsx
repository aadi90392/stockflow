import { useState } from "react";
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
  const [activeFlow, setActiveFlow] = useState(0);
  const workflows = [
    {
      name: "Purchase & receive",
      icon: Truck,
      title: "From supplier order to stock on your shelves.",
      description:
        "Create a purchase order, choose the receiving location and record deliveries as they arrive. Partial receipts keep the outstanding quantity visible.",
      steps: [
        "Choose a product and supplier",
        "Record the quantity ordered",
        "Receive all or part of the delivery",
      ],
      note: "Stock increases only when a delivery is received.",
    },
    {
      name: "Store & transfer",
      icon: Warehouse,
      title: "One product. Every location accounted for.",
      description:
        "Keep warehouse and store balances separate. Dispatch a transfer from the source, then confirm receipt when it reaches its destination.",
      steps: [
        "Choose source and destination",
        "Dispatch available units",
        "Confirm arrival at the destination",
      ],
      note: "In-transit stock stays visible until it is received.",
    },
    {
      name: "Sell & return",
      icon: ShoppingBagIcon,
      title: "Keep every sale connected to your inventory.",
      description:
        "Record units sold from the right location. If a customer returns an item, link it to the original sale and track how many units remain returnable.",
      steps: [
        "Select the product and location",
        "Record the sale quantity",
        "Process a partial or full return",
      ],
      note: "Returns cannot exceed the quantity originally sold.",
    },
  ];
  const workflow = workflows[activeFlow];
  const WorkflowIcon = workflow.icon;
  function explore(index: number) {
    setActiveFlow(index);
    document
      .getElementById("operations")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  return (
    <div className="landing landing-expanded">
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
          <a href="#operations">Explore workflows</a>
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
              <button
                className="route-step"
                key={n}
                onClick={() => explore(Number(n) - 1)}
                aria-label={`Explore ${title}`}
              >
                <span className="route-icon">
                  <Icon size={22} />
                </span>
                <section>
                  <small>STEP {n}</small>
                  <b>{title}</b>
                  <p>{description}</p>
                </section>
                <ArrowUpRight size={15} />
              </button>
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
      <section className="section workflow-explorer" id="operations">
        <div className="explorer-heading">
          <div>
            <span className="eyebrow">EXPLORE YOUR DAILY WORKFLOW</span>
            <h2>
              Every move has
              <br />a clear next step.
            </h2>
          </div>
          <p>
            See how StockFlow connects purchasing, storage and sales. Select an
            operation to explore the process.
          </p>
        </div>
        <div
          className="workflow-tabs"
          role="tablist"
          aria-label="Inventory workflows"
        >
          {workflows.map((w, i) => (
            <button
              key={w.name}
              role="tab"
              id={`workflow-tab-${i}`}
              aria-controls="workflow-panel"
              aria-selected={activeFlow === i}
              onClick={() => setActiveFlow(i)}
                onKeyDown={(e) => {
                  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
                  e.preventDefault();
                  const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                  setActiveFlow(next);
                  document.getElementById(`workflow-tab-${next}`)?.focus();
                }}
                tabIndex={activeFlow === i ? 0 : -1}
            >
              <w.icon size={22} />
              <span>0{i + 1}</span>
              {w.name}
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
        <div
          className="workflow-detail"
          id="workflow-panel"
          role="tabpanel"
          aria-labelledby={`workflow-tab-${activeFlow}`}
        >
          <div className="workflow-story">
            <span className="eyebrow">{workflow.name.toUpperCase()}</span>
            <h3>{workflow.title}</h3>
            <p>{workflow.description}</p>
            <button className="btn green" onClick={start}>
              Start in your workspace <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="process-visual">
            <div className="process-heading">
              <WorkflowIcon size={29} />
              <span>THE PROCESS / 0{activeFlow + 1}</span>
            </div>
            {workflow.steps.map((step, i) => (
              <div className="process-step" key={step}>
                <span>0{i + 1}</span>
                <b>{step}</b>
                <Check size={18} />
              </div>
            ))}
            <p>
              <ShieldCheck size={20} />
              {workflow.note}
            </p>
          </div>
        </div>
      </section>
      <section className="inventory-capabilities section">
        <div className="section-heading">
          <span className="eyebrow">BUILT AROUND THE WAY STOCK MOVES</span>
          <h2>
            The details that keep
            <br />
            your operation together.
          </h2>
          <p>
            One place to organize your products, coordinate your people and
            understand each stock change.
          </p>
        </div>
        <div className="capability-grid">
          {[
            [
              Package,
              "Product catalogue",
              "Identify items by SKU, add product photos and set reorder thresholds.",
              "how",
            ],
            [
              Warehouse,
              "Location-level balances",
              "See what is available at each store or warehouse before moving stock.",
              "operations",
            ],
            [
              Truck,
              "Supplier & purchase records",
              "Keep supplier details alongside orders and outstanding deliveries.",
              "operations",
            ],
            [
              ArrowLeftRight,
              "Sales & return tracking",
              "Connect returns to their original sale and keep quantities consistent.",
              "operations",
            ],
            [
              ShieldCheck,
              "Traceable stock ledger",
              "Review receipts, sales, adjustments and transfers with a movement history.",
              "features",
            ],
            [
              Users,
              "Your team, with clear roles",
              "Give owners, managers and staff the access their work needs.",
              "features",
            ],
          ].map(([Icon, title, description, target]: any) => (
            <a className="capability-card" key={title} href={`#${target}`}>
              <Icon size={26} />
              <h3>{title}</h3>
              <p>{description}</p>
              <span>
                Explore feature <ArrowUpRight size={16} />
              </span>
            </a>
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
      <section className="landing-final-cta">
        <div>
          <span className="eyebrow">YOUR NEXT MOVE STARTS HERE</span>
          <h2>
            Less stock confusion.
            <br />
            More room to grow.
          </h2>
          <p>
            Create your workspace, add a location and start tracking your first
            product.
          </p>
        </div>
        <button className="btn green large" onClick={start}>
          Open your workspace <ArrowUpRight size={20} />
        </button>
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
