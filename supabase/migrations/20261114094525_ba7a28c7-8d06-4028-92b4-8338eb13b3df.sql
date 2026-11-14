ALTER TABLE public.leads_settings ADD COLUMN IF NOT EXISTS last_auto_sent_at timestamptz;
ALTER TABLE public.leads_settings ALTER COLUMN template_key SET DEFAULT '';
CREATE INDEX IF NOT EXISTS leads_status_scheduled_idx ON public.leads (status, scheduled_at);
INSERT INTO public.leads_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;