ALTER TABLE public.tracking_config
  ADD COLUMN snapchat_pixel_active boolean NOT NULL DEFAULT false,
  ADD COLUMN snapchat_pixel_id text,
  ADD COLUMN snapchat_access_token text,
  ADD COLUMN snapchat_capi_active boolean NOT NULL DEFAULT false,
  ADD COLUMN pinterest_tag_active boolean NOT NULL DEFAULT false,
  ADD COLUMN pinterest_tag_id text,
  ADD COLUMN pinterest_access_token text,
  ADD COLUMN pinterest_capi_active boolean NOT NULL DEFAULT false,
  ADD COLUMN linkedin_partner_id text,
  ADD COLUMN linkedin_insight_active boolean NOT NULL DEFAULT false,
  ADD COLUMN linkedin_capi_active boolean NOT NULL DEFAULT false,
  ADD COLUMN linkedin_access_token text;