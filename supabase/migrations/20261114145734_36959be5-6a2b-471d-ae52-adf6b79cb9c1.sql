ALTER TABLE public.smtp_accounts
  ADD COLUMN provider text NOT NULL DEFAULT 'smtp',
  ADD COLUMN api_key text,
  ADD COLUMN api_key_hint text;
ALTER TABLE public.smtp_accounts ALTER COLUMN host DROP NOT NULL, ALTER COLUMN user_email DROP NOT NULL;
ALTER TABLE public.smtp_accounts ADD CONSTRAINT smtp_accounts_provider_check CHECK (provider IN ('smtp','resend'));
ALTER TABLE public.smtp_accounts ADD CONSTRAINT smtp_accounts_provider_fields CHECK (
  (provider = 'smtp' AND host IS NOT NULL AND user_email IS NOT NULL) OR (provider = 'resend' AND api_key IS NOT NULL));

CREATE OR REPLACE FUNCTION public.smtp_accounts_key_hint() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.api_key IS NULL THEN NEW.api_key_hint := NULL;
  ELSE NEW.api_key_hint := left(NEW.api_key, 4) || '…' || right(NEW.api_key, 4); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER smtp_accounts_key_hint BEFORE INSERT OR UPDATE OF api_key ON public.smtp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.smtp_accounts_key_hint();

GRANT SELECT (provider, api_key_hint) ON public.smtp_accounts TO authenticated;
GRANT INSERT (provider, api_key), UPDATE (provider, api_key) ON public.smtp_accounts TO authenticated;
GRANT ALL ON public.smtp_accounts TO service_role;