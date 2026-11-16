import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, StatCard as Card, StatusBadge, fmtDate } from "@/components/admin/ui";
import { Activity, Mail, Megaphone, Percent, Send, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDashboardStats } from "@/lib/dashboard.functions";

const statsQuery = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats(), refetchInterval: 30000 });

export const Route = createFileRoute("/_authenticated/admin/overview")({
  head: () => ({ meta: [{ title: "Übersicht – Postwerk Admin" }, { name: "description", content: "Versandleistung, Leads und Systemaktivität auf einen Blick." }, { property: "og:title", content: "Übersicht – Postwerk Admin" }, { property: "og:description", content: "Versandleistung, Leads und Systemaktivität auf einen Blick." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(statsQuery); },
  component: Overview,
  pendingComponent: OverviewSkeleton,
  errorComponent: ({ error }) => <p className="text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
});

const LEAD_LABEL: Record<string, string> = { new: "neu", scheduled: "geplant", sent: "gesendet", failed: "fehlgeschlagen" };
const LEAD_COLOR: Record<string, string> = { new: "var(--muted-foreground)", scheduled: "var(--secondary-foreground)", sent: "var(--primary)", failed: "var(--destructive)" };

const barConfig = { count: { label: "Mails", color: "var(--primary)" } } satisfies ChartConfig;
const pieConfig = Object.fromEntries(Object.entries(LEAD_LABEL).map(([k, v]) => [k, { label: v, color: LEAD_COLOR[k] ?? "" }])) as ChartConfig;

function Overview() {
  const { data: s } = useSuspenseQuery(statsQuery);
  const days = s.perDay.map((d) => ({ ...d, label: d.date.slice(8, 10) + "." + d.date.slice(5, 7) + "." }));
  const pie = s.leadStatus.filter((l) => l.count > 0).map((l) => ({ ...l, fill: LEAD_COLOR[l.status] }));
  return (
    <>
      <PageHeader title="Übersicht" description="Versandleistung, Leads und Systemaktivität auf einen Blick." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><div><Card label="SMTP-Konten" value={`${s.accounts.active} / ${s.accounts.total}`} sub="aktiv / gesamt" icon={Mail} /></div></TooltipTrigger>
            <TooltipContent>{s.accounts.blocked} gesperrt</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Card label="Kampagnen" value={`${s.campaigns.done} / ${s.campaigns.started}`} sub="fertig / gestartet" icon={Megaphone} />
        <Card label="Leads gesamt" value={s.leadsTotal} sub="alle Quellen" icon={Users} />
        <Card label="Mails heute" value={s.sentToday} sub="aktive Konten" icon={Send} />
        <Card label="Erfolgsquote" value={s.lastCampaign?.rate != null ? `${s.lastCampaign.rate.toLocaleString("de-DE")} %` : "–"} sub={s.lastCampaign?.name ?? "noch keine Kampagne"} icon={Percent} />
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <Panel title="Mails pro Tag" sub="Kampagnen und Auto-Leads, letzte 14 Tage" className="lg:col-span-2">
          <ChartContainer config={barConfig} className="h-64 w-full">
            <BarChart data={days}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel title="Leads nach Status" sub="Aktuelle Verteilung">
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
        </Panel>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Aktivitäten</h2>
          <span className="ml-auto text-xs text-muted-foreground">letzte 10 Einträge</span>
        </header>
        {s.logs.length === 0 && <p className="p-5 text-sm text-muted-foreground">Noch keine Logeinträge.</p>}
        <div className="divide-y divide-border">
          {s.logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm hover:bg-row-hover">
              <span className="w-36 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(l.created_at)}</span>
              <span className="w-20 shrink-0"><StatusBadge value={l.type} /></span>
              <span className="min-w-0 flex-1 break-words">{l.message}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-3 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div>
    </div>
  );
}
