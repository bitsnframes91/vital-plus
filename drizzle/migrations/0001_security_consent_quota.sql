CREATE TABLE public.health_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  policy_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  data_choice text
);
CREATE INDEX health_consents_user_idx ON public.health_consents (user_id, consented_at DESC);
GRANT SELECT ON public.health_consents TO authenticated;
GRANT ALL ON public.health_consents TO service_role;
ALTER TABLE public.health_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own consents" ON public.health_consents FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_time_idx ON public.ai_usage (user_id, created_at DESC);
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Current consent state for the caller: 'active', 'withdrawn' or 'none'.
CREATE OR REPLACE FUNCTION public.health_consent_status(_version text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE WHEN withdrawn_at IS NOT NULL THEN 'withdrawn'
                WHEN policy_version = _version THEN 'active'
                ELSE 'outdated' END
    FROM public.health_consents WHERE user_id = auth.uid()
    ORDER BY consented_at DESC LIMIT 1), 'none');
$$;

CREATE OR REPLACE FUNCTION public.give_health_consent(_version text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _version IS NULL OR length(_version) > 40 THEN RAISE EXCEPTION 'invalid version'; END IF;
  INSERT INTO public.health_consents (user_id, policy_version) VALUES (auth.uid(), _version);
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_health_consent(_delete_data boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  UPDATE public.health_consents SET withdrawn_at = now(), data_choice = CASE WHEN _delete_data THEN 'deleted' ELSE 'kept' END
    WHERE user_id = auth.uid() AND withdrawn_at IS NULL;
  INSERT INTO public.health_consents (user_id, policy_version, withdrawn_at, data_choice)
    SELECT auth.uid(), 'withdrawal', now(), CASE WHEN _delete_data THEN 'deleted' ELSE 'kept' END;
  IF _delete_data THEN DELETE FROM public.user_data WHERE user_id = auth.uid(); END IF;
END $$;

-- Atomically checks consent, per-minute and daily limits, then records one AI call.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(_kind text, _version text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); per_min int; per_day int;
BEGIN
  IF uid IS NULL THEN RETURN 'unauthenticated'; END IF;
  IF _kind NOT IN ('meal_text','meal_voice','meal_photo','lab') THEN RETURN 'invalid'; END IF;
  IF public.health_consent_status(_version) <> 'active' THEN RETURN 'no_consent'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ai_quota:' || uid::text));
  per_day := CASE WHEN _kind = 'lab' THEN 10 ELSE 60 END;
  per_min := CASE WHEN _kind = 'lab' THEN 2 ELSE 6 END;
  IF (SELECT count(*) FROM public.ai_usage WHERE user_id = uid AND kind = _kind AND created_at > now() - interval '1 minute') >= per_min THEN RETURN 'rate_limited'; END IF;
  IF (SELECT count(*) FROM public.ai_usage WHERE user_id = uid AND kind = _kind AND created_at > now() - interval '1 day') >= per_day THEN RETURN 'quota_exceeded'; END IF;
  INSERT INTO public.ai_usage (user_id, kind) VALUES (uid, _kind);
  RETURN 'ok';
END $$;

REVOKE ALL ON FUNCTION public.health_consent_status(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.give_health_consent(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_health_consent(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_ai_quota(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.health_consent_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.give_health_consent(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_health_consent(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(text, text) TO authenticated;

-- Block health-data writes after an explicit withdrawal (deleting stays allowed).
CREATE OR REPLACE FUNCTION public.block_health_writes_after_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (SELECT withdrawn_at IS NOT NULL FROM public.health_consents WHERE user_id = NEW.user_id ORDER BY consented_at DESC LIMIT 1) THEN
    RAISE EXCEPTION 'health data consent withdrawn' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER user_data_consent_guard BEFORE INSERT OR UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.block_health_writes_after_withdrawal();

-- Feedback spam protection: size limits and at most one submission per minute per user.
CREATE OR REPLACE FUNCTION public.app_feedback_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(NEW.message) > 2000 OR NEW.rating < 1 OR NEW.rating > 5 OR coalesce(array_length(NEW.topics, 1), 0) > 10 THEN
    RAISE EXCEPTION 'invalid feedback';
  END IF;
  IF NEW.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.app_feedback WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') THEN
    RAISE EXCEPTION 'feedback rate limited';
  END IF;
  IF NEW.user_id IS NULL AND (SELECT count(*) FROM public.app_feedback WHERE user_id IS NULL AND created_at > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'feedback rate limited';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER app_feedback_guard BEFORE INSERT ON public.app_feedback
  FOR EACH ROW EXECUTE FUNCTION public.app_feedback_guard();