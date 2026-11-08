import { useEffect, useRef, ReactNode } from "react";
import { X, Package, Plus } from "lucide-react";
export type Row = Record<string, any>;
export type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  value?: string | number;
  required?: boolean;
  min?: number;
  max?: number;
  help?: string;
};
export const money = (x: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(x / 100);
export const date = (x: number) =>
  new Date(x).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export async function api(path: string, data?: unknown) {
  const r = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const j: any = await r.json();
  if (!r.ok) throw Error(j.error || "Unable to complete request");
  return j;
}
export function Empty({
  title,
  detail,
  button,
  action,
}: {
  title: string;
  detail: string;
  button?: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <span>
        <Package size={30} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {button && (
        <button className="btn green" onClick={action}>
          {button}
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,button,select")?.focus();
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && el) {
        const items = Array.from(
          el.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]",
          ),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={close}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" aria-label="Close dialog" onClick={close}>
          <X />
        </button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function exportCsv(rows: Row[], page: number) {
  if (!rows.length) return;
  const keys = [
    "created_at",
    "product",
    "sku",
    "location",
    "kind",
    "delta",
    "reason",
    "actor",
  ];
  const safe = (v: unknown) => {
    let x = String(v ?? "");
    if (/^[=+@-]/.test(x)) x = "'" + x;
    return '"' + x.replaceAll('"', '""') + '"';
  };
  const blob = new Blob(
    [
      keys.join(",") +
        "\n" +
        rows
          .map((r) =>
            keys
              .map((k) =>
                safe(k === "created_at" ? new Date(r[k]).toISOString() : r[k]),
              )
              .join(","),
          )
          .join("\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stockflow-ledger-page-" + page + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
