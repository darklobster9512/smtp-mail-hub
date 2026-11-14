import type { ReactNode } from "react";

export function PageHeader({ title, description }: { title: string; description?: string | undefined }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function DataTable({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border text-left text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={head.length} className="px-4 py-10 text-center text-muted-foreground">{empty}</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BADGE: Record<string, string> = {
  active: "bg-primary/15 text-primary", sent: "bg-primary/15 text-primary", done: "bg-primary/15 text-primary",
  failed: "bg-destructive/15 text-destructive", error: "bg-destructive/15 text-destructive", blocked: "bg-destructive/15 text-destructive", disabled: "bg-destructive/15 text-destructive",
  sending: "bg-chart-3/15 text-chart-3", aborted: "bg-chart-4/15 text-chart-4",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${BADGE[value] ?? "bg-secondary text-muted-foreground"}`}>
      {value}
    </span>
  );
}

export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("de-DE") : "–");
