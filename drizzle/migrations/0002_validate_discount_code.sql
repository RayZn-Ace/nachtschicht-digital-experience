CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text, p_event_id uuid)
RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.id, d.code, d.discount_type, d.discount_value
  FROM public.discount_codes d
  WHERE length(btrim(p_code)) BETWEEN 1 AND 100
    AND d.code = upper(btrim(p_code))
    AND d.is_active = true
    AND (d.event_id IS NULL OR d.event_id = p_event_id)
    AND (d.max_uses IS NULL OR d.uses < d.max_uses)
    AND (d.valid_from IS NULL OR d.valid_from <= now())
    AND (d.valid_until IS NULL OR d.valid_until > now())
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.is_published = true)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.validate_discount_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text, uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.validate_discount_code(text, uuid) IS 'Exact-code checkout validation. Returns only public discount terms; never exposes code lists or usage metadata.';