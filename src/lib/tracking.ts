/**
 * Central Tracking Engine
 * Dispatches events to DataLayer, Meta Pixel, TikTok Pixel, GA4, Google Ads
 * based on admin-configured settings loaded from DB.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrackingConfig {
  gtm_active: boolean;
  gtm_container_id: string | null;
  meta_pixel_active: boolean;
  meta_pixel_id: string | null;
  meta_advanced_matching: boolean;
  meta_capi_active: boolean;
  meta_access_token: string | null;
  meta_dataset_id: string | null;
  meta_test_event_code: string | null;
  tiktok_pixel_active: boolean;
  tiktok_pixel_id: string | null;
  tiktok_events_api_active: boolean;
  tiktok_access_token: string | null;
  ga4_active: boolean;
  ga4_measurement_id: string | null;
  google_ads_active: boolean;
  google_ads_conversion_id: string | null;
  google_ads_conversion_labels: Record<string, string>;
  google_enhanced_conversions: boolean;
  google_server_backup: boolean;
  ga4_api_secret: string | null;
  consent_active: boolean;
  consent_mode_v2: boolean;
  consent_defaults: Record<string, string>;
  debug_mode: boolean;
}

export interface TrackingEventData {
  event_name: string;
  event_id?: string;
  // Standard
  page_url?: string;
  referrer?: string;
  device?: string;
  browser?: string;
  // Event-ticket specific
  event_name_full?: string;
  event_date?: string;
  event_location?: string;
  city?: string;
  venue?: string;
  category?: string;
  ticket_type?: string;
  ticket_quantity?: number;
  ticket_price?: number;
  currency?: string;
  value?: number;
  content_ids?: string[];
  content_type?: string;
  order_id?: string;
  items?: Array<Record<string, any>>;
  // User
  email?: string;
  phone?: string;
  user_id?: string;
  // Extra
  [key: string]: any;
}

// ─── Globals ─────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    dataLayer: any[];
    fbq: (...args: any[]) => void;
    ttq: any;
    gtag: (...args: any[]) => void;
  }
}

let _config: TrackingConfig | null = null;
let _configLoading = false;
let _configCallbacks: Array<(c: TrackingConfig) => void> = [];
let _scriptsLoaded: Set<string> = new Set();
let _consentGranted = false;

// ─── UTM & Click ID Persistence ─────────────────────────────────────────────

export const persistAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid"];
  const data: Record<string, string> = {};
  keys.forEach((k) => {
    const v = params.get(k);
    if (v) data[k] = v;
  });
  if (Object.keys(data).length > 0) {
    sessionStorage.setItem("tracking_attribution", JSON.stringify({ ...getAttribution(), ...data }));
  }
};

export const getAttribution = (): Record<string, string> => {
  try {
    return JSON.parse(sessionStorage.getItem("tracking_attribution") || "{}");
  } catch { return {}; }
};

// ─── Hash Utilities ──────────────────────────────────────────────────────────

const sha256 = async (str: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

// ─── Script Loading ──────────────────────────────────────────────────────────

const loadScript = (id: string, src: string, onLoad?: () => void) => {
  if (_scriptsLoaded.has(id) || document.getElementById(id)) { onLoad?.(); return; }
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.async = true;
  s.onload = () => { _scriptsLoaded.add(id); onLoad?.(); };
  document.head.appendChild(s);
};

const loadInlineScript = (id: string, code: string) => {
  if (_scriptsLoaded.has(id) || document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
  _scriptsLoaded.add(id);
};

// ─── Config Loading ──────────────────────────────────────────────────────────

export const loadConfig = async (): Promise<TrackingConfig> => {
  if (_config) return _config;
  if (_configLoading) {
    return new Promise((resolve) => { _configCallbacks.push(resolve); });
  }
  _configLoading = true;
  const { data } = await supabase.from("tracking_config").select("*").limit(1).maybeSingle();
  const config: TrackingConfig = data ? (data as any) : getDefaultConfig();
  _config = config;
  _configLoading = false;
  _configCallbacks.forEach((cb) => cb(config));
  _configCallbacks = [];
  return config;
};

const getDefaultConfig = (): TrackingConfig => ({
  gtm_active: false, gtm_container_id: null,
  meta_pixel_active: false, meta_pixel_id: null, meta_advanced_matching: false,
  meta_capi_active: false, meta_access_token: null, meta_dataset_id: null, meta_test_event_code: null,
  tiktok_pixel_active: false, tiktok_pixel_id: null, tiktok_events_api_active: false, tiktok_access_token: null,
  ga4_active: false, ga4_measurement_id: null,
  google_ads_active: false, google_ads_conversion_id: null, google_ads_conversion_labels: {},
  google_enhanced_conversions: false, google_server_backup: false, ga4_api_secret: null,
  consent_active: false, consent_mode_v2: false, consent_defaults: {},
  debug_mode: false,
});

export const reloadConfig = () => { _config = null; };

// ─── Initialization ──────────────────────────────────────────────────────────

export const initTracking = async () => {
  persistAttribution();
  const config = await loadConfig();

  // Consent defaults
  if (config.consent_active && config.consent_mode_v2) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "consent_default",
      ...config.consent_defaults,
    });
  }

  // GTM
  if (config.gtm_active && config.gtm_container_id) {
    window.dataLayer = window.dataLayer || [];
    loadInlineScript("gtm-init", `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${config.gtm_container_id}');
    `);
  }

  // Meta Pixel
  if (config.meta_pixel_active && config.meta_pixel_id) {
    loadInlineScript("meta-pixel", `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${config.meta_pixel_id}'${config.meta_advanced_matching ? ",{}" : ""});
    `);
  }

  // TikTok Pixel
  if (config.tiktok_pixel_active && config.tiktok_pixel_id) {
    loadInlineScript("tiktok-pixel", `
      !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=
      ["page","track","identify","instances","debug","on","off","once","ready","alias",
      "group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
      ttq._o=ttq._o||{};ttq._o[e]=n||{};
      var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=r+"?sdkid="+e+"&lib="+t;
      var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${config.tiktok_pixel_id}');ttq.page()}(window,document,'ttq');
    `);
  }

  // GA4 + Google Ads
  if ((config.ga4_active && config.ga4_measurement_id) || (config.google_ads_active && config.google_ads_conversion_id)) {
    const primaryId = config.ga4_measurement_id || config.google_ads_conversion_id;
    loadScript("gtag-js", `https://www.googletagmanager.com/gtag/js?id=${primaryId}`, () => {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() { window.dataLayer.push(arguments); } as any;
      (window.gtag as any)("js", new Date());
      if (config.ga4_active && config.ga4_measurement_id) {
        (window.gtag as any)("config", config.ga4_measurement_id, { send_page_view: false });
      }
      if (config.google_ads_active && config.google_ads_conversion_id) {
        (window.gtag as any)("config", config.google_ads_conversion_id);
      }
    });
  }

  if (config.debug_mode) {
    console.log("[Tracking] Initialized with config:", config);
  }
};

// ─── Consent ─────────────────────────────────────────────────────────────────

export const grantConsent = () => {
  _consentGranted = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "consent_update",
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  if (window.gtag) {
    (window.gtag as any)("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  }
};

export const isConsentGranted = () => _consentGranted;

// ─── Generate Event ID ──────────────────────────────────────────────────────

const generateEventId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ─── Track Event (Central Dispatch) ──────────────────────────────────────────

export const trackEvent = async (data: TrackingEventData) => {
  const config = await loadConfig();
  const eventId = data.event_id || generateEventId();
  const enrichedData: TrackingEventData = {
    ...data,
    event_id: eventId,
    page_url: data.page_url || window.location.href,
    referrer: data.referrer || document.referrer,
    device: data.device || (navigator.maxTouchPoints > 0 ? "mobile" : "desktop"),
    browser: data.browser || navigator.userAgent.split(" ").pop()?.split("/")[0] || "unknown",
    timestamp: new Date().toISOString(),
    ...getAttribution(),
  };

  const platforms: string[] = [];

  if (config.consent_active && !_consentGranted && data.event_name !== "PageView") {
    if (config.debug_mode) console.log("[Tracking] Blocked (no consent):", data.event_name);
    return;
  }

  // 1. DataLayer (always if GTM active)
  if (config.gtm_active && config.gtm_container_id) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: enrichedData.event_name, ...enrichedData });
    platforms.push("dataLayer");
  }

  // 2. Meta Pixel
  if (config.meta_pixel_active && config.meta_pixel_id && window.fbq) {
    const metaEventMap: Record<string, string> = {
      PageView: "PageView", ViewEvent: "ViewContent", SelectTicket: "CustomizeProduct",
      AddToCart: "AddToCart", ViewCart: "ViewContent", InitiateCheckout: "InitiateCheckout",
      AddPaymentInfo: "AddPaymentInfo", PaymentStart: "InitiateCheckout",
      Purchase: "Purchase", Lead: "Lead",
    };
    const fbEvent = metaEventMap[enrichedData.event_name] || enrichedData.event_name;
    const fbParams: Record<string, any> = {
      content_ids: enrichedData.content_ids,
      content_type: enrichedData.content_type || "event",
      value: enrichedData.value,
      currency: enrichedData.currency || "EUR",
      content_name: enrichedData.event_name_full,
      num_items: enrichedData.ticket_quantity,
    };
    window.fbq("track", fbEvent, fbParams, { eventID: eventId });
    platforms.push("meta_pixel");
  }

  // 3. TikTok Pixel
  if (config.tiktok_pixel_active && config.tiktok_pixel_id && window.ttq) {
    const ttEventMap: Record<string, string> = {
      PageView: "Pageview", ViewEvent: "ViewContent", AddToCart: "AddToCart",
      InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment",
      Lead: "SubmitForm",
    };
    const ttEvent = ttEventMap[enrichedData.event_name] || enrichedData.event_name;
    window.ttq.track(ttEvent, {
      content_id: enrichedData.content_ids?.[0],
      content_type: "product",
      value: enrichedData.value,
      currency: enrichedData.currency || "EUR",
      quantity: enrichedData.ticket_quantity,
    }, { event_id: eventId });
    platforms.push("tiktok_pixel");
  }

  // 4. GA4
  if (config.ga4_active && config.ga4_measurement_id && window.gtag) {
    const ga4EventMap: Record<string, string> = {
      PageView: "page_view", ViewEvent: "view_item", AddToCart: "add_to_cart",
      InitiateCheckout: "begin_checkout", AddPaymentInfo: "add_payment_info",
      Purchase: "purchase", Lead: "generate_lead",
    };
    const ga4Event = ga4EventMap[enrichedData.event_name] || enrichedData.event_name;
    (window.gtag as any)("event", ga4Event, {
      event_id: eventId,
      currency: enrichedData.currency || "EUR",
      value: enrichedData.value,
      items: enrichedData.items || [{
        item_id: enrichedData.content_ids?.[0],
        item_name: enrichedData.event_name_full,
        price: enrichedData.ticket_price,
        quantity: enrichedData.ticket_quantity,
        item_category: enrichedData.category,
      }],
      transaction_id: enrichedData.order_id,
    });
    platforms.push("ga4");
  }

  // 5. Google Ads Conversion
  if (config.google_ads_active && config.google_ads_conversion_id && window.gtag) {
    const labels = config.google_ads_conversion_labels || {};
    const label = labels[enrichedData.event_name];
    if (label) {
      (window.gtag as any)("event", "conversion", {
        send_to: `${config.google_ads_conversion_id}/${label}`,
        value: enrichedData.value,
        currency: enrichedData.currency || "EUR",
        transaction_id: enrichedData.order_id,
      });
      platforms.push("google_ads");
    }
  }

  // 6. Server-side (Meta CAPI + TikTok Events API)
  if (config.meta_capi_active || config.tiktok_events_api_active || config.google_server_backup) {
    sendServerEvent(config, enrichedData, eventId).catch((err) => {
      if (config.debug_mode) console.error("[Tracking] Server-side error:", err);
    });
    platforms.push("server");
  }

  // Log to DB
  logTrackingEvent(enrichedData.event_name, eventId, platforms, enrichedData).catch(() => {});

  if (config.debug_mode) {
    console.log(`[Tracking] ${enrichedData.event_name}`, { eventId, platforms, data: enrichedData });
  }
};

// ─── Server-Side Event ───────────────────────────────────────────────────────

const sendServerEvent = async (config: TrackingConfig, data: TrackingEventData, eventId: string) => {
  const hashedEmail = data.email ? await sha256(data.email) : undefined;
  const hashedPhone = data.phone ? await sha256(data.phone) : undefined;

  await supabase.functions.invoke("track-event", {
    body: {
      event_name: data.event_name,
      event_id: eventId,
      user_data: {
        email: hashedEmail,
        phone: hashedPhone,
        external_id: data.user_id,
        client_ip_address: undefined, // set by edge function
        client_user_agent: navigator.userAgent,
        fbc: getAttribution().fbclid ? `fb.1.${Date.now()}.${getAttribution().fbclid}` : undefined,
        fbp: getCookie("_fbp"),
        ttp: getCookie("_ttp"),
      },
      custom_data: {
        content_ids: data.content_ids,
        content_type: data.content_type || "event",
        value: data.value,
        currency: data.currency || "EUR",
        content_name: data.event_name_full,
        num_items: data.ticket_quantity,
        order_id: data.order_id,
      },
      event_source_url: data.page_url || window.location.href,
      action_source: "website",
    },
  });
};

// ─── Event Logging ───────────────────────────────────────────────────────────

const logTrackingEvent = async (eventName: string, eventId: string, platforms: string[], payload: any) => {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    await supabase.from("tracking_events").insert({
      event_name: eventName,
      event_id: eventId,
      platforms,
      payload,
      status: "sent",
      user_id: userId,
    } as any);
  } catch {}
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCookie = (name: string): string | undefined => {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match?.[2];
};

// ─── Convenience Helpers ─────────────────────────────────────────────────────

export const trackPageView = () => trackEvent({ event_name: "PageView" });

export const trackViewEvent = (event: { id: string; title: string; date: string; category?: string; price?: number }) =>
  trackEvent({
    event_name: "ViewEvent",
    content_ids: [event.id],
    event_name_full: event.title,
    event_date: event.date,
    category: event.category,
    value: event.price,
    ticket_price: event.price,
    content_type: "event",
  });

export const trackAddToCart = (event: { id: string; title: string; price: number; quantity: number }) =>
  trackEvent({
    event_name: "AddToCart",
    content_ids: [event.id],
    event_name_full: event.title,
    value: event.price * event.quantity,
    ticket_price: event.price,
    ticket_quantity: event.quantity,
    currency: "EUR",
    content_type: "event",
  });

export const trackPurchase = (order: { orderId: string; eventId: string; eventTitle: string; price: number; quantity: number; email?: string }) =>
  trackEvent({
    event_name: "Purchase",
    order_id: order.orderId,
    content_ids: [order.eventId],
    event_name_full: order.eventTitle,
    value: order.price * order.quantity,
    ticket_price: order.price,
    ticket_quantity: order.quantity,
    currency: "EUR",
    content_type: "event",
    email: order.email,
  });

export const trackLead = (data?: Record<string, any>) =>
  trackEvent({ event_name: "Lead", ...data });
