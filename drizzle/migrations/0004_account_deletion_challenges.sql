CREATE TABLE public.account_deletion_challenges (
  user_id uuid PRIMARY KEY,
  challenge_id uuid,
  code_mac text,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  consumed_at timestamptz,
  state text NOT NULL DEFAULT 'pending',
  deleting_until timestamptz,
  last_sent_at timestamptz,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_deletion_challenges TO service_role;
REVOKE ALL ON public.account_deletion_challenges FROM anon, authenticated;
ALTER TABLE public.account_deletion_challenges ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_deletion_challenges IS 'Server-only deletion challenges. Stores only HMAC values bound to user, challenge and operation; no client access.';

-- Issues a new challenge, enforcing a 60 s resend cooldown and at most 5 codes per hour.
CREATE OR REPLACE FUNCTION public.issue_account_deletion_challenge(_user_id uuid, _challenge_id uuid, _code_mac text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.account_deletion_challenges;
BEGIN
  INSERT INTO public.account_deletion_challenges(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM public.account_deletion_challenges WHERE user_id = _user_id FOR UPDATE;
  IF r.last_sent_at IS NOT NULL AND r.last_sent_at > now() - interval '60 seconds' THEN RETURN 'cooldown'; END IF;
  IF r.window_start < now() - interval '1 hour' THEN r.window_start := now(); r.window_count := 0; END IF;
  IF r.window_count >= 5 THEN RETURN 'limited'; END IF;
  UPDATE public.account_deletion_challenges SET
    challenge_id = _challenge_id, code_mac = _code_mac, attempts = 0,
    expires_at = now() + interval '10 minutes', consumed_at = NULL,
    state = CASE WHEN state = 'deleting' AND deleting_until > now() THEN state ELSE 'pending' END,
    last_sent_at = now(), window_start = r.window_start, window_count = r.window_count + 1, updated_at = now()
  WHERE user_id = _user_id;
  RETURN 'ok';
END $$;

-- Returns the active challenge id (needed to recompute the MAC) without exposing the MAC.
CREATE OR REPLACE FUNCTION public.account_deletion_challenge_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT challenge_id FROM public.account_deletion_challenges
  WHERE user_id = _user_id AND consumed_at IS NULL AND expires_at > now();
$$;

-- Atomically verifies and consumes a challenge (row lock serialises concurrent attempts).
CREATE OR REPLACE FUNCTION public.consume_account_deletion_challenge(_user_id uuid, _challenge_id uuid, _code_mac text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.account_deletion_challenges;
BEGIN
  SELECT * INTO r FROM public.account_deletion_challenges WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR r.code_mac IS NULL OR r.challenge_id IS DISTINCT FROM _challenge_id THEN RETURN 'invalid'; END IF;
  IF r.consumed_at IS NOT NULL THEN RETURN 'invalid'; END IF;
  IF r.expires_at <= now() THEN RETURN 'expired'; END IF;
  IF r.attempts >= 5 THEN RETURN 'locked'; END IF;
  IF r.code_mac <> _code_mac THEN
    UPDATE public.account_deletion_challenges SET attempts = attempts + 1,
      code_mac = CASE WHEN attempts + 1 >= 5 THEN NULL ELSE code_mac END, updated_at = now()
    WHERE user_id = _user_id;
    RETURN CASE WHEN r.attempts + 1 >= 5 THEN 'locked' ELSE 'invalid' END;
  END IF;
  UPDATE public.account_deletion_challenges SET consumed_at = now(), code_mac = NULL,
    state = 'deleting', deleting_until = now() + interval '30 minutes', updated_at = now()
  WHERE user_id = _user_id;
  RETURN 'ok';
END $$;

-- True only while a verified deletion for this user is in progress (resume after partial failure).
CREATE OR REPLACE FUNCTION public.account_deletion_in_progress(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.account_deletion_challenges
    WHERE user_id = _user_id AND state = 'deleting' AND deleting_until > now());
$$;

REVOKE ALL ON FUNCTION public.issue_account_deletion_challenge(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.account_deletion_challenge_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_account_deletion_challenge(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.account_deletion_in_progress(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_account_deletion_challenge(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.account_deletion_challenge_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_account_deletion_challenge(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.account_deletion_in_progress(uuid) TO service_role;