
-- Single-row config table for all tracking settings
CREATE TABLE public.tracking_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- GTM
  gtm_active BOOLEAN NOT NULL DEFAULT false,
  gtm_container_id TEXT,
  
  -- Meta
  meta_pixel_active BOOLEAN NOT NULL DEFAULT false,
  meta_pixel_id TEXT,
  meta_advanced_matching BOOLEAN NOT NULL DEFAULT false,
  meta_capi_active BOOLEAN NOT NULL DEFAULT false,
  meta_access_token TEXT,
  meta_dataset_id TEXT,
  meta_test_event_code TEXT,
  
  -- TikTok
  tiktok_pixel_active BOOLEAN NOT NULL DEFAULT false,
  tiktok_pixel_id TEXT,
  tiktok_events_api_active BOOLEAN NOT NULL DEFAULT false,
  tiktok_access_token TEXT,
  
  -- Google
  ga4_active BOOLEAN NOT NULL DEFAULT false,
  ga4_measurement_id TEXT,
  google_ads_active BOOLEAN NOT NULL DEFAULT false,
  google_ads_conversion_id TEXT,
  google_ads_conversion_labels JSONB DEFAULT '{}',
  google_enhanced_conversions BOOLEAN NOT NULL DEFAULT false,
  google_server_backup BOOLEAN NOT NULL DEFAULT false,
  ga4_api_secret TEXT,
  
  -- Consent
  consent_active BOOLEAN NOT NULL DEFAULT false,
  consent_mode_v2 BOOLEAN NOT NULL DEFAULT false,
  consent_defaults JSONB DEFAULT '{"analytics_storage":"denied","ad_storage":"denied","ad_user_data":"denied","ad_personalization":"denied"}',
  
  -- Debug
  debug_mode BOOLEAN NOT NULL DEFAULT false,
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking config"
  ON public.tracking_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read tracking config"
  ON public.tracking_config FOR SELECT
  USING (true);

-- Insert default row
INSERT INTO public.tracking_config (id) VALUES (gen_random_uuid());

-- Event log for dedup, monitoring, retry
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  platforms JSONB NOT NULL DEFAULT '[]',
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking events"
  ON public.tracking_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert tracking events"
  ON public.tracking_events FOR INSERT
  WITH CHECK (true);

-- Index for dedup
CREATE UNIQUE INDEX tracking_events_dedup ON public.tracking_events (event_id, event_name) WHERE status = 'sent';
