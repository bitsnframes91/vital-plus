CREATE TABLE public.user_data (user_id uuid PRIMARY KEY, state jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own data" ON public.user_data FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);