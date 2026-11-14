ALTER TABLE public.campaign_recipients ADD COLUMN first_name text, ADD COLUMN last_name text, ADD COLUMN anrede text;
ALTER TABLE public.campaigns ADD COLUMN smtp_account_ids uuid[] NOT NULL DEFAULT '{}', ADD COLUMN rr_index int NOT NULL DEFAULT 0, ADD COLUMN last_error text;
CREATE INDEX campaign_recipients_campaign_status_idx ON public.campaign_recipients(campaign_id, status);

CREATE OR REPLACE FUNCTION public.claim_sender_lock(_ttl_seconds int) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  INSERT INTO public.admin_settings(key, value) VALUES ('sender_lock', jsonb_build_object('until', 0))
  ON CONFLICT (key) DO NOTHING;
  UPDATE public.admin_settings SET value = jsonb_build_object('until', extract(epoch FROM now()) + _ttl_seconds)
  WHERE key = 'sender_lock' AND COALESCE((value->>'until')::numeric, 0) < extract(epoch FROM now())
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.release_sender_lock() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.admin_settings SET value = jsonb_build_object('until', 0) WHERE key = 'sender_lock';
$$;

REVOKE EXECUTE ON FUNCTION public.claim_sender_lock(int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_sender_lock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sender_lock(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_sender_lock() TO service_role;