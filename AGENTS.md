<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Landing page sections live in `src/components/landing/` and are composed in `src/routes/index.tsx`; keeps the route file small.
- Admin area lives under `src/routes/_authenticated/admin.*`; the `_authenticated` gate is client-only (session in localStorage). Data access is admin-only via `has_role()` RLS; first signup becomes admin via DB trigger.
- `smtp_accounts.password` has no SELECT grant for `authenticated`; only server code (service role) may read it.
- Server-side SMTP uses `worker-mailer` (cloudflare:sockets) inside createServerFn handlers, not Supabase Edge Functions (edge functions block port 587; nodemailer is Node-only). Bearer token attached via `src/lib/auth-attacher.ts` in start.ts.
- Campaign sending runs in `src/lib/campaign-sender.server.ts` (`runTick`, ~40s budget, 1 mail/s, global DB lock). Triggered by the open campaign detail page or an external scheduler POSTing `/api/public/campaign-tick` with `x-cron-secret`; no pg_cron HTTP callbacks for user-managed Supabase.
