import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";

export function PageHeader({ title, description, actions }: { title: string; description?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted"><Inbox className="h-4 w-4" /></span>
      {text}
    </div>
  );
}

export function DataTable({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm tabular-nums">
        <thead className="border-b border-border bg-table-head text-left">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={head.length}><EmptyState text={empty} /></td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="group border-b border-border transition-colors last:border-0 hover:bg-row-hover">
              {r.map((c, j) => <td key={j} className="px-4 py-2.5 align-middle [&_button]:opacity-70 group-hover:[&_button]:opacity-100">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BADGE: Record<string, string> = {
  active: "text-primary", sent: "text-primary", done: "text-primary",
  failed: "text-destructive", error: "text-destructive", blocked: "text-destructive", disabled: "text-destructive",
  sending: "text-chart-3", aborted: "text-chart-4", warning: "text-chart-4", info: "text-chart-3",
};

export function StatusBadge({ value }: { value: string }) {
  const c = BADGE[value] ?? "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium ${c}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="text-foreground">{value}</span>
    </span>
  );
}

export function StatCard({ label, value, sub, icon: Icon }: { label: string; value: ReactNode; sub?: string | undefined; icon?: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Panel({ title, sub, children, className = "" }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className}`}>
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("de-DE") : "–");
