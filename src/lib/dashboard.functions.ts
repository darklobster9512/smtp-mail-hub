import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { berlinDay, groupByDay, successRate } from "./dashboard-calc";

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Keine Berechtigung.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 15 * 86400e3).toISOString();
    const today = berlinDay(new Date());
    const cnt = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);

    const [accounts, campDone, campStarted, leadsTotal, lastCamp, recSent, leadSent, logs, ...leadStatus] = await Promise.all([
      db.from("smtp_accounts").select("status, sent_today, sent_date"),
      cnt(db.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "done")),
      cnt(db.from("campaigns").select("id", { count: "exact", head: true }).neq("status", "draft")),
      cnt(db.from("leads").select("id", { count: "exact", head: true })),
      db.from("campaigns").select("name, sent, failed").not("started_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("campaign_recipients").select("sent_at").eq("status", "sent").gte("sent_at", since).limit(50000),
      db.from("leads").select("sent_at").eq("status", "sent").gte("sent_at", since).limit(50000),
      db.from("mail_logs").select("id, type, message, created_at").order("created_at", { ascending: false }).limit(10),
      ...(["new", "scheduled", "sent", "failed"] as const).map((s) => cnt(db.from("leads").select("id", { count: "exact", head: true }).eq("status", s))),
    ]);

    const acc = accounts.data ?? [];
    const active = acc.filter((a) => a.status === "active");
    const lc = lastCamp.data;
    return {
      accounts: { active: active.length, total: acc.length, blocked: acc.filter((a) => a.status === "blocked").length },
      campaigns: { done: campDone, started: campStarted },
      leadsTotal,
      sentToday: active.reduce((s, a) => s + (a.sent_date === today ? a.sent_today : 0), 0),
      lastCampaign: lc ? { name: lc.name, rate: successRate(lc.sent, lc.failed) } : null,
      perDay: groupByDay([...(recSent.data ?? []), ...(leadSent.data ?? [])].map((r) => r.sent_at)),
      leadStatus: (["new", "scheduled", "sent", "failed"] as const).map((s, i) => ({ status: s, count: leadStatus[i] as number })),
      logs: logs.data ?? [],
    };
  });
