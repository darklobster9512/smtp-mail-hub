CREATE OR REPLACE FUNCTION public.ingest_leads(_leads jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record; slot timestamptz; last_slot timestamptz; first_slot timestamptz;
  item jsonb; em text; accepted int := 0; dups int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ingest_leads'));
  SELECT delay_seconds, min_gap_seconds INTO s FROM leads_settings WHERE id = 1;
  SELECT max(scheduled_at) INTO last_slot FROM leads WHERE status = 'scheduled';
  FOR item IN SELECT * FROM jsonb_array_elements(_leads) LOOP
    em := lower(trim(item->>'email'));
    IF em IS NULL OR em !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' OR length(em) > 255 THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM leads WHERE lower(email) = em) THEN dups := dups + 1; CONTINUE; END IF;
    slot := now() + make_interval(secs => coalesce(s.delay_seconds, 0));
    IF last_slot IS NOT NULL AND last_slot + make_interval(secs => coalesce(s.min_gap_seconds, 0)) > slot THEN
      slot := last_slot + make_interval(secs => coalesce(s.min_gap_seconds, 0));
    END IF;
    INSERT INTO leads (email, first_name, last_name, source, status, scheduled_at)
    VALUES (em, nullif(left(trim(item->>'first_name'), 100), ''), nullif(left(trim(item->>'last_name'), 100), ''),
            coalesce(nullif(left(trim(item->>'source'), 100), ''), 'api'), 'scheduled', slot);
    last_slot := slot; accepted := accepted + 1;
    IF first_slot IS NULL THEN first_slot := slot; END IF;
  END LOOP;
  RETURN jsonb_build_object('accepted', accepted, 'duplicates', dups, 'scheduled_at', first_slot, 'last_scheduled_at', last_slot);
END $$;
REVOKE ALL ON FUNCTION public.ingest_leads(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_leads(jsonb) TO service_role;

INSERT INTO public.admin_settings (key, value)
SELECT 'app_base_url', to_jsonb('https://project--1304ce56-0e4b-4c22-ad0a-6a07b2dd78c9.lovable.app'::text)
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE key = 'app_base_url');