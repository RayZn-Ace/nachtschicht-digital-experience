
-- Step 1: Drop ALL policies that depend on has_role(uuid, app_role)
-- Public tables
DROP POLICY IF EXISTS "Admins can view deletion logs" ON public.account_deletions;
DROP POLICY IF EXISTS "Admins can manage album photos" ON public.album_photos;
DROP POLICY IF EXISTS "Admins can manage albums" ON public.albums;
DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can manage drink categories" ON public.drink_categories;
DROP POLICY IF EXISTS "Admins can manage drinks" ON public.drinks;
DROP POLICY IF EXISTS "Admins can manage event lounges" ON public.event_lounges;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.event_tag_assignments;
DROP POLICY IF EXISTS "Admins can manage tags" ON public.event_tags;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage genres" ON public.genres;
DROP POLICY IF EXISTS "Admins can manage holiday specials" ON public.holiday_specials;
DROP POLICY IF EXISTS "Admins can manage invoice config" ON public.invoice_config;
DROP POLICY IF EXISTS "Admins can read invoice config" ON public.invoice_config;
DROP POLICY IF EXISTS "Admins can manage line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can manage lost and found" ON public.lost_and_found;
DROP POLICY IF EXISTS "Admins can manage lounge bookings" ON public.lounge_bookings;
DROP POLICY IF EXISTS "Admins can manage lounges" ON public.lounges;
DROP POLICY IF EXISTS "Admins can manage newsletter categories" ON public.newsletter_categories;
DROP POLICY IF EXISTS "Admins can manage newsletter sends" ON public.newsletter_sends;
DROP POLICY IF EXISTS "Admins can manage subscriber categories" ON public.newsletter_subscriber_categories;
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletters" ON public.newsletters;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.photo_reports;
DROP POLICY IF EXISTS "Admins can manage reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage ticket types" ON public.ticket_types;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can manage tracking config" ON public.tracking_config;
DROP POLICY IF EXISTS "Admins can manage tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Admins can view u18 forms" ON public.u18_forms;
DROP POLICY IF EXISTS "Admins can delete u18 forms" ON public.u18_forms;

-- Storage policies
DROP POLICY IF EXISTS "Admins can upload album files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete album files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view report photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload newsletter banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update newsletter banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete newsletter banners" ON storage.objects;

-- Step 2: Drop the enum-based function
DROP FUNCTION public.has_role(uuid, app_role);

-- Step 3: Drop the enum type (no longer needed)
DROP TYPE IF EXISTS public.app_role;

-- Step 4: Recreate all policies using text-based has_role
CREATE POLICY "Admins can view deletion logs" ON public.account_deletions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage album photos" ON public.album_photos FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage albums" ON public.albums FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage discount codes" ON public.discount_codes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage drink categories" ON public.drink_categories FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage drinks" ON public.drinks FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage event lounges" ON public.event_lounges FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage assignments" ON public.event_tag_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tags" ON public.event_tags FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage genres" ON public.genres FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage holiday specials" ON public.holiday_specials FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage invoice config" ON public.invoice_config FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read invoice config" ON public.invoice_config FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage line items" ON public.invoice_line_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage applications" ON public.job_applications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage lost and found" ON public.lost_and_found FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage lounge bookings" ON public.lounge_bookings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage lounges" ON public.lounges FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage newsletter categories" ON public.newsletter_categories FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage newsletter sends" ON public.newsletter_sends FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subscriber categories" ON public.newsletter_subscriber_categories FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage newsletters" ON public.newsletters FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all reports" ON public.photo_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage reservations" ON public.reservations FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view reservations" ON public.reservations FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage ticket types" ON public.ticket_types FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tickets" ON public.tickets FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tracking config" ON public.tracking_config FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tracking events" ON public.tracking_events FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view u18 forms" ON public.u18_forms FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete u18 forms" ON public.u18_forms FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Storage policies recreated with text-based has_role
CREATE POLICY "Admins can upload album files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'albums' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete album files" ON storage.objects FOR DELETE USING (bucket_id = 'albums' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload event images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete event images" ON storage.objects FOR DELETE USING (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view report photos" ON storage.objects FOR SELECT USING (bucket_id = 'report-photos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload newsletter banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'newsletter-banners' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update newsletter banners" ON storage.objects FOR UPDATE USING (bucket_id = 'newsletter-banners' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete newsletter banners" ON storage.objects FOR DELETE USING (bucket_id = 'newsletter-banners' AND has_role(auth.uid(), 'admin'));
