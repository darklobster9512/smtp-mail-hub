import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { maskProxyUrl, parseProxyUrl, proxyUrlSchema } from "./proxy-url";

async function adminClient(ctx: { userId: string; supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> } }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Keine Berechtigung.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getProxies = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminClient(context);
  const [proxies, settings] = await Promise.all([
    db.from("mail_proxies").select("*").order("created_at"),
    db.from("mail_proxy_settings").select("enabled, strategy").eq("id", 1).single(),
  ]);
  if (proxies.error || settings.error) throw new Error("Proxy-Einstellungen konnten nicht geladen werden.");
  return {
    proxies: proxies.data.map(({ proxy_url, ...row }) => ({ ...row, masked_url: maskProxyUrl(proxy_url) })),
    settings: settings.data,
  };
});

export const saveProxy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid().optional(), label: z.string().trim().min(1).max(100),
    proxy_url: z.union([z.literal(""), proxyUrlSchema]), country: z.string().trim().max(60).nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const values = { label: data.label, country: data.country || null };
    if (!data.id && !data.proxy_url) throw new Error("Proxy-URL fehlt.");
    const parsed = data.proxy_url ? parseProxyUrl(data.proxy_url) : null;
    const urlFields = parsed ? { proxy_url: data.proxy_url, protocol: parsed.protocol } : {};
    const result = data.id
      ? await db.from("mail_proxies").update({ ...values, ...urlFields }).eq("id", data.id).select("id").single()
      : await db.from("mail_proxies").insert({ ...values, proxy_url: data.proxy_url, protocol: parsed?.protocol ?? "http" }).select("id").single();
    if (result.error) throw new Error("Proxy konnte nicht gespeichert werden.");
    return { ok: true };
  });

export const setProxyStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), status: z.enum(["active", "disabled"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { error } = await db.from("mail_proxies").update({ status: data.status, ...(data.status === "active" ? { error_count: 0 } : {}) }).eq("id", data.id);
    if (error) throw new Error("Status konnte nicht geändert werden.");
    return { ok: true };
  });

export const deleteProxy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { error } = await db.from("mail_proxies").delete().eq("id", data.id);
    if (error) throw new Error("Proxy konnte nicht gelöscht werden.");
    return { ok: true };
  });

export const saveProxySettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ enabled: z.boolean(), strategy: z.enum(["random", "round_robin"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { error } = await db.from("mail_proxy_settings").update(data).eq("id", 1);
    if (error) throw new Error("Einstellungen konnten nicht gespeichert werden.");
    return { ok: true };
  });

export const testProxy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: proxy, error } = await db.from("mail_proxies").select("proxy_url").eq("id", data.id).single();
    if (error || !proxy) throw new Error("Proxy nicht gefunden.");
    try {
      const { fetchExitIp } = await import("./proxy-socket.server");
      return { ok: true as const, ip: await fetchExitIp(parseProxyUrl(proxy.proxy_url)) };
    } catch (e) {
      // Our own errors only name host:port and never contain credentials or upstream response bodies.
      const msg = e instanceof Error ? e.message.replace(/\b[a-z0-9+.-]+:\/\/\S+/gi, "(URL)").slice(0, 200) : "";
      return { ok: false as const, error: msg || "Proxy-Verbindung fehlgeschlagen." };
    }
  });
