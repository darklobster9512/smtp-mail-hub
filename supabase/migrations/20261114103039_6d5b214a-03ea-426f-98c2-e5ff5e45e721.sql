CREATE TABLE public.mail_proxies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  proxy_url text NOT NULL,
  protocol text NOT NULL CHECK (protocol IN ('http','socks5')),
  country text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  error_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mail_proxy_settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  strategy text NOT NULL DEFAULT 'random' CHECK (strategy IN ('random','round_robin')),
  rr_counter bigint NOT NULL DEFAULT 0
);

-- Only server code (service role) may touch these tables: proxy URLs contain credentials.
GRANT ALL ON public.mail_proxies TO service_role;
GRANT ALL ON public.mail_proxy_settings TO service_role;

ALTER TABLE public.mail_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_proxy_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.mail_proxy_settings (id, enabled, strategy) VALUES (1, false, 'random');

-- Atomically picks the next active proxy according to the configured strategy.
-- Returns no row when the pool is disabled or has no active proxy.
CREATE OR REPLACE FUNCTION public.pick_mail_proxy()
RETURNS SETOF public.mail_proxies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.mail_proxy_settings%ROWTYPE;
  n integer;
BEGIN
  SELECT * INTO s FROM public.mail_proxy_settings WHERE id = 1 FOR UPDATE;
  IF NOT FOUND OR NOT s.enabled THEN RETURN; END IF;
  SELECT count(*) INTO n FROM public.mail_proxies WHERE status = 'active';
  IF n = 0 THEN RETURN; END IF;
  IF s.strategy = 'round_robin' THEN
    UPDATE public.mail_proxy_settings SET rr_counter = rr_counter + 1 WHERE id = 1;
    RETURN QUERY SELECT * FROM public.mail_proxies WHERE status = 'active'
      ORDER BY created_at, id OFFSET (s.rr_counter % n) LIMIT 1;
  ELSE
    RETURN QUERY SELECT * FROM public.mail_proxies WHERE status = 'active' ORDER BY random() LIMIT 1;
  END IF;
END;
$$;

-- Records the outcome of a send attempt. ok: usage+1, last_used_at, error_count reset.
-- failure: error_count+1; the proxy is disabled after 5 consecutive failures.
CREATE OR REPLACE FUNCTION public.record_mail_proxy_result(_id uuid, _ok boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _ok THEN
    UPDATE public.mail_proxies SET usage_count = usage_count + 1, last_used_at = now(), error_count = 0 WHERE id = _id;
  ELSE
    UPDATE public.mail_proxies
      SET error_count = error_count + 1,
          status = CASE WHEN error_count + 1 >= 5 THEN 'disabled' ELSE status END
      WHERE id = _id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.pick_mail_proxy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_mail_proxy_result(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_mail_proxy() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_mail_proxy_result(uuid, boolean) TO service_role;