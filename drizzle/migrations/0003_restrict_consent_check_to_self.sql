CREATE OR REPLACE FUNCTION public.has_active_health_consent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND COALESCE((
    SELECT withdrawn_at IS NULL AND policy_version = public.current_health_consent_version()
    FROM public.health_consents WHERE user_id = _user_id
    ORDER BY consented_at DESC LIMIT 1), false);
$$;