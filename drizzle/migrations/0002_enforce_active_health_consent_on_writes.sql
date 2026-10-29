CREATE OR REPLACE FUNCTION public.current_health_consent_version()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$ SELECT '2026-10-v1'::text $$;

CREATE OR REPLACE FUNCTION public.has_active_health_consent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT withdrawn_at IS NULL AND policy_version = public.current_health_consent_version()
    FROM public.health_consents WHERE user_id = _user_id
    ORDER BY consented_at DESC LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.block_health_writes_after_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  -- Requests from app users (any JWT role) need an active consent for the current policy.
  -- Service-role maintenance (auth.uid() IS NULL) is unaffected.
  IF auth.uid() IS NOT NULL AND NOT public.has_active_health_consent(auth.uid()) THEN
    RAISE EXCEPTION 'health data consent required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

DROP POLICY IF EXISTS "Own data" ON public.user_data;
CREATE POLICY "Read own data" ON public.user_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own data" ON public.user_data FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own data with consent" ON public.user_data FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_health_consent(auth.uid()));
CREATE POLICY "Update own data with consent" ON public.user_data FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_active_health_consent(auth.uid()));

REVOKE ALL ON public.user_data FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.health_consents FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_health_consent(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_active_health_consent(uuid) TO authenticated;