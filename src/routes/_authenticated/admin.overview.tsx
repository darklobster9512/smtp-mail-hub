import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { PageHeader, fmtDate } from "@/components/admin/ui";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDashboardStats } from "@/lib/dashboard.functions";

const statsQuery = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats(), refetchInterval: 30000 });

export const Route = createFileRoute("/_authenticated/admin/overview")({
  head: () => ({ meta: [{ title: "Übersicht – Postwerk Admin" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(statsQuery); },
  component: Overview,
  errorComponent: ({ error }) => <p className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
});

const LEAD_LABEL: Record<string, string> = { new: "neu", scheduled: "geplant", sent: "gesendet", failed: "fehlgeschlagen" };
const LEAD_COLOR: Record<string, string> = { new: "var(--muted-foreground)", scheduled: "var(--secondary-foreground)", sent: "var(--primary)", failed: "var(--destructive)" };
const LOG_BADGE: Record<string, string> = { info: "bg-chart-2/15 text-chart-2", warning: "bg-chart-4/15 text-chart-4", error: "bg-destructive/15 text-destructive" };

const barConfig = { count: { label: "Mails", color: "var(--primary)" } } satisfies ChartConfig;
const pieConfig = Object.fromEntries(Object.entries(LEAD_LABEL).map(([k, v]) => [k, { label: v, color: LEAD_COLOR[k] ?? "" }])) as ChartConfig;

function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Overview() {
  const { data: s } = useSuspenseQuery(statsQuery);
  const days = s.perDay.map((d) => ({ ...d, label: d.date.slice(8, 10) + "." + d.date.slice(5, 7) + "." }));
  const pie = s.leadStatus.filter((l) => l.count > 0).map((l) => ({ ...l, fill: LEAD_COLOR[l.status] }));
  return (
    <>
      <PageHeader title="Übersicht" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><div><Card label="SMTP-Konten" value={`${s.accounts.active} / ${s.accounts.total}`} sub="aktiv / gesamt" /></div></TooltipTrigger>
            <TooltipContent>{s.accounts.blocked} gesperrt</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Card label="Kampagnen" value={`${s.campaigns.done} / ${s.campaigns.started}`} sub="fertig / gestartet" />
        <Card label="Leads gesamt" value={s.leadsTotal} />
        <Card label="Mails heute" value={s.sentToday} sub="aktive Konten" />
        <Card label="Erfolgsquote" value={s.lastCampaign?.rate != null ? `${s.lastCampaign.rate.toLocaleString("de-DE")} %` : "–"} sub={s.lastCampaign?.name ?? "noch keine Kampagne"} />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Mails pro Tag (14 Tage)</h2>
          <ChartContainer config={barConfig} className="h-64 w-full">
            <BarChart data={days}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Leads nach Status</h2>
          {pie.length === 0 ? <p className="py-20 text-center text-sm text-muted-foreground">Noch keine Leads.</p> : (
            <ChartContainer config={pieConfig} className="mx-auto h-48">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                <Pie data={pie} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} strokeWidth={2}>
                  {pie.map((p) => <Cell key={p.status} fill={p.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
          <ul className="mt-4 space-y-1 text-sm">
            {s.leadStatus.map((l) => (
              <li key={l.status} className="flex justify-between">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEAD_COLOR[l.status] }} />{LEAD_LABEL[l.status]}</span>
                <span className="font-medium">{l.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="mb-3 font-semibold">Aktivitäten</h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {s.logs.length === 0 && <p className="p-5 text-sm text-muted-foreground">Noch keine Logeinträge.</p>}
        {s.logs.map((l) => (
          <div key={l.id} className="flex items-start gap-4 px-5 py-3 text-sm">
            <span className="w-40 shrink-0 text-muted-foreground">{fmtDate(l.created_at)}</span>
            <span className={`w-16 shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-medium ${LOG_BADGE[l.type] ?? "bg-secondary text-muted-foreground"}`}>{l.type}</span>
            <span className="min-w-0 break-words">{l.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
