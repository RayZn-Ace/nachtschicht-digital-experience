import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServerEventPayload {
  event_name: string;
  event_id: string;
  user_data: {
    email?: string;
    phone?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    ttp?: string;
  };
  custom_data: {
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
    content_name?: string;
    num_items?: number;
    order_id?: string;
  };
  event_source_url?: string;
  action_source?: string;
}

// Load config from DB
async function getTrackingConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/rest/v1/tracking_config?select=*&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  return data?.[0] || null;
}

// Meta Conversions API
async function sendMetaCAPI(config: any, payload: ServerEventPayload, clientIp: string) {
  if (!config.meta_capi_active || !config.meta_access_token || !config.meta_dataset_id) return;

  const metaEventMap: Record<string, string> = {
    PageView: "PageView", ViewEvent: "ViewContent", AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout", AddPaymentInfo: "AddPaymentInfo",
    Purchase: "Purchase", Lead: "Lead",
  };

  const body = {
    data: [{
      event_name: metaEventMap[payload.event_name] || payload.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: payload.event_id,
      event_source_url: payload.event_source_url,
      action_source: payload.action_source || "website",
      user_data: {
        em: payload.user_data.email ? [payload.user_data.email] : undefined,
        ph: payload.user_data.phone ? [payload.user_data.phone] : undefined,
        external_id: payload.user_data.external_id ? [payload.user_data.external_id] : undefined,
        client_ip_address: clientIp,
        client_user_agent: payload.user_data.client_user_agent,
        fbc: payload.user_data.fbc,
        fbp: payload.user_data.fbp,
      },
      custom_data: {
        content_ids: payload.custom_data.content_ids,
        content_type: payload.custom_data.content_type,
        value: payload.custom_data.value,
        currency: payload.custom_data.currency || "EUR",
        content_name: payload.custom_data.content_name,
        num_items: payload.custom_data.num_items,
        order_id: payload.custom_data.order_id,
      },
    }],
    ...(config.meta_test_event_code ? { test_event_code: config.meta_test_event_code } : {}),
  };

  const url = `https://graph.facebook.com/v19.0/${config.meta_dataset_id}/events?access_token=${config.meta_access_token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Meta CAPI] Error:", text);
    throw new Error(`Meta CAPI: ${res.status}`);
  }
  await res.text();
}

// TikTok Events API
async function sendTikTokAPI(config: any, payload: ServerEventPayload, clientIp: string) {
  if (!config.tiktok_events_api_active || !config.tiktok_access_token || !config.tiktok_pixel_id) return;

  const ttEventMap: Record<string, string> = {
    PageView: "Pageview", ViewEvent: "ViewContent", AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment", Lead: "SubmitForm",
  };

  const body = {
    pixel_code: config.tiktok_pixel_id,
    event: ttEventMap[payload.event_name] || payload.event_name,
    event_id: payload.event_id,
    timestamp: new Date().toISOString(),
    context: {
      user_agent: payload.user_data.client_user_agent,
      ip: clientIp,
      user: {
        external_id: payload.user_data.external_id,
        email: payload.user_data.email,
        phone_number: payload.user_data.phone,
        ttp: payload.user_data.ttp,
      },
      page: { url: payload.event_source_url },
    },
    properties: {
      content_id: payload.custom_data.content_ids?.[0],
      content_type: "product",
      value: payload.custom_data.value,
      currency: payload.custom_data.currency || "EUR",
      quantity: payload.custom_data.num_items,
      order_id: payload.custom_data.order_id,
    },
  };

  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": config.tiktok_access_token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[TikTok API] Error:", text);
    throw new Error(`TikTok API: ${res.status}`);
  }
  await res.text();
}

// GA4 Measurement Protocol
async function sendGA4MP(config: any, payload: ServerEventPayload) {
  if (!config.google_server_backup || !config.ga4_measurement_id || !config.ga4_api_secret) return;

  const ga4EventMap: Record<string, string> = {
    PageView: "page_view", ViewEvent: "view_item", AddToCart: "add_to_cart",
    InitiateCheckout: "begin_checkout", Purchase: "purchase", Lead: "generate_lead",
  };

  const body = {
    client_id: payload.user_data.external_id || "anonymous",
    events: [{
      name: ga4EventMap[payload.event_name] || payload.event_name,
      params: {
        event_id: payload.event_id,
        currency: payload.custom_data.currency || "EUR",
        value: payload.custom_data.value,
        transaction_id: payload.custom_data.order_id,
        items: payload.custom_data.content_ids?.map((id) => ({
          item_id: id,
          item_name: payload.custom_data.content_name,
          price: payload.custom_data.value,
          quantity: payload.custom_data.num_items || 1,
        })),
      },
    }],
  };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${config.ga4_measurement_id}&api_secret=${config.ga4_api_secret}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await res.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ServerEventPayload = await req.json();
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "0.0.0.0";

    const config = await getTrackingConfig();
    if (!config) {
      return new Response(JSON.stringify({ error: "No tracking config" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, string> = {};

    // Send to all configured platforms in parallel
    const promises: Promise<void>[] = [];

    if (config.meta_capi_active) {
      promises.push(
        sendMetaCAPI(config, payload, clientIp)
          .then(() => { results.meta_capi = "ok"; })
          .catch((e) => { results.meta_capi = e.message; })
      );
    }

    if (config.tiktok_events_api_active) {
      promises.push(
        sendTikTokAPI(config, payload, clientIp)
          .then(() => { results.tiktok_api = "ok"; })
          .catch((e) => { results.tiktok_api = e.message; })
      );
    }

    if (config.google_server_backup) {
      promises.push(
        sendGA4MP(config, payload)
          .then(() => { results.ga4_mp = "ok"; })
          .catch((e) => { results.ga4_mp = e.message; })
      );
    }

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[track-event] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
