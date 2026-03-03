
-- 1. TRACKING_CONFIG: Restrict full table to admin-only, create public RPC for safe fields
DROP POLICY IF EXISTS "Anyone can read tracking config" ON public.tracking_config;

CREATE OR REPLACE FUNCTION public.get_tracking_config_public()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'gtm_active', t.gtm_active,
    'gtm_container_id', t.gtm_container_id,
    'meta_pixel_active', t.meta_pixel_active,
    'meta_pixel_id', t.meta_pixel_id,
    'meta_advanced_matching', t.meta_advanced_matching,
    'meta_capi_active', t.meta_capi_active,
    'meta_dataset_id', t.meta_dataset_id,
    'meta_test_event_code', t.meta_test_event_code,
    'tiktok_pixel_active', t.tiktok_pixel_active,
    'tiktok_pixel_id', t.tiktok_pixel_id,
    'tiktok_events_api_active', t.tiktok_events_api_active,
    'ga4_active', t.ga4_active,
    'ga4_measurement_id', t.ga4_measurement_id,
    'google_ads_active', t.google_ads_active,
    'google_ads_conversion_id', t.google_ads_conversion_id,
    'google_ads_conversion_labels', t.google_ads_conversion_labels,
    'google_enhanced_conversions', t.google_enhanced_conversions,
    'google_server_backup', t.google_server_backup,
    'consent_active', t.consent_active,
    'consent_mode_v2', t.consent_mode_v2,
    'consent_defaults', t.consent_defaults,
    'debug_mode', t.debug_mode,
    'snapchat_pixel_active', t.snapchat_pixel_active,
    'snapchat_pixel_id', t.snapchat_pixel_id,
    'pinterest_tag_active', t.pinterest_tag_active,
    'pinterest_tag_id', t.pinterest_tag_id,
    'linkedin_insight_active', t.linkedin_insight_active,
    'linkedin_partner_id', t.linkedin_partner_id,
    'linkedin_capi_active', t.linkedin_capi_active,
    'snapchat_capi_active', t.snapchat_capi_active,
    'pinterest_capi_active', t.pinterest_capi_active
  )
  FROM public.tracking_config t
  LIMIT 1
$$;

-- 2. INVOICE_CONFIG: Restrict to admin-only
DROP POLICY IF EXISTS "Anyone can read invoice config" ON public.invoice_config;

CREATE POLICY "Admins can read invoice config"
ON public.invoice_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. NEWSLETTER-BANNERS STORAGE: Restrict to admin-only
DROP POLICY IF EXISTS "Authenticated upload newsletter banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage newsletter banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete newsletter banners" ON storage.objects;

CREATE POLICY "Admins can upload newsletter banners" 
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'newsletter-banners' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update newsletter banners" 
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'newsletter-banners' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete newsletter banners" 
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'newsletter-banners' AND public.has_role(auth.uid(), 'admin'::app_role));
