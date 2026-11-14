CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.admin_exists() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') $$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(424242);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TABLE public.admin_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.smtp_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text, host text NOT NULL, port int NOT NULL DEFAULT 587, user_email text NOT NULL, password text, from_name text, from_email text, klick_domain text, daily_limit int NOT NULL DEFAULT 1500, sent_today int NOT NULL DEFAULT 0, sent_date date, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, subject text, html_content text, status text NOT NULL DEFAULT 'draft', total int NOT NULL DEFAULT 0, sent int NOT NULL DEFAULT 0, failed int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz);
CREATE TABLE public.campaign_recipients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE, email text NOT NULL, status text NOT NULL DEFAULT 'pending', smtp_account_used uuid REFERENCES public.smtp_accounts(id) ON DELETE SET NULL, error text, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, first_name text, last_name text, source text, status text NOT NULL DEFAULT 'new', scheduled_at timestamptz, sent_at timestamptz, campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL, smtp_account_used uuid REFERENCES public.smtp_accounts(id) ON DELETE SET NULL, error text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.leads_settings (id int PRIMARY KEY DEFAULT 1, auto_campaign_enabled boolean NOT NULL DEFAULT false, template_key text NOT NULL DEFAULT 'klimabonus', delay_seconds int NOT NULL DEFAULT 30, min_gap_seconds int NOT NULL DEFAULT 15);
CREATE TABLE public.mail_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL DEFAULT 'info', message text NOT NULL, details jsonb, created_at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE FUNCTION public.leads_settings_singleton() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.id <> 1 THEN RAISE EXCEPTION 'leads_settings only allows id=1'; END IF; RETURN NEW; END $$;
CREATE TRIGGER leads_settings_singleton BEFORE INSERT OR UPDATE ON public.leads_settings FOR EACH ROW EXECUTE FUNCTION public.leads_settings_singleton();
INSERT INTO public.leads_settings(id) VALUES (1);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['admin_settings','smtp_accounts','campaigns','campaign_recipients','leads','leads_settings','mail_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "admins full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

REVOKE SELECT ON public.smtp_accounts FROM authenticated;
GRANT SELECT (id, label, host, port, user_email, from_name, from_email, klick_domain, daily_limit, sent_today, sent_date, status, created_at) ON public.smtp_accounts TO authenticated;