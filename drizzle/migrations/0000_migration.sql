DROP POLICY "Anyone can submit feedback" ON public.app_feedback;
CREATE POLICY "Visitors submit anonymous feedback" ON public.app_feedback FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Users submit own feedback" ON public.app_feedback FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));