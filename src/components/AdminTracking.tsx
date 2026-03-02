import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, RotateCcw, Activity, Search, Trash2, Play, Bug } from "lucide-react";
import { trackEvent, reloadConfig } from "@/lib/tracking";

interface Config {
  id: string;
  gtm_active: boolean; gtm_container_id: string;
  meta_pixel_active: boolean; meta_pixel_id: string; meta_advanced_matching: boolean;
  meta_capi_active: boolean; meta_access_token: string; meta_dataset_id: string; meta_test_event_code: string;
  tiktok_pixel_active: boolean; tiktok_pixel_id: string; tiktok_events_api_active: boolean; tiktok_access_token: string;
  snapchat_pixel_active: boolean; snapchat_pixel_id: string; snapchat_access_token: string; snapchat_capi_active: boolean;
  pinterest_tag_active: boolean; pinterest_tag_id: string; pinterest_access_token: string; pinterest_capi_active: boolean;
  linkedin_insight_active: boolean; linkedin_partner_id: string; linkedin_access_token: string; linkedin_capi_active: boolean;
  ga4_active: boolean; ga4_measurement_id: string;
  google_ads_active: boolean; google_ads_conversion_id: string; google_ads_conversion_labels: Record<string, string>;
  google_enhanced_conversions: boolean; google_server_backup: boolean; ga4_api_secret: string;
  consent_active: boolean; consent_mode_v2: boolean; consent_defaults: Record<string, string>;
  debug_mode: boolean;
}

interface TrackingLog {
  id: string; event_name: string; event_id: string; platforms: string[];
  status: string; error_message: string | null; created_at: string;
}

const defaultLabels: Record<string, string> = {
  Purchase: "", AddToCart: "", InitiateCheckout: "", Lead: "", ViewEvent: "",
};

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${checked ? "translate-x-5" : ""}`} />
    </div>
    <span className="text-sm text-foreground">{label}</span>
  </label>
);

const Field = ({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
  </div>
);

const Section = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="glass-card p-5 space-y-4">
    <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const AdminTracking = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "logs" | "test">("config");

  // Logs
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase.from("tracking_config").select("*").limit(1).maybeSingle();
    if (data) setConfig(data as any);
    setLoading(false);
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from("tracking_events")
      .select("id, event_name, event_id, platforms, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data as any);
    setLogsLoading(false);
  };

  useEffect(() => { fetchConfig(); }, []);
  useEffect(() => { if (activeTab === "logs") fetchLogs(); }, [activeTab]);

  const update = <K extends keyof Config>(key: K, val: Config[K]) => {
    if (!config) return;
    setConfig({ ...config, [key]: val });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { id, ...rest } = config;
    const { error } = await supabase.from("tracking_config").update({ ...rest, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) { toast.error("Fehler: " + error.message); }
    else { toast.success("Tracking-Konfiguration gespeichert!"); reloadConfig(); }
    setSaving(false);
  };

  const sendTestEvent = async (eventName: string) => {
    await trackEvent({
      event_name: eventName,
      event_id: `test-${Date.now()}`,
      event_name_full: "Test Event",
      value: 29.99,
      ticket_price: 29.99,
      ticket_quantity: 1,
      currency: "EUR",
      content_ids: ["test-event-123"],
      content_type: "event",
      category: "Party",
    });
    toast.success(`Test-Event "${eventName}" gesendet!`);
    if (activeTab === "logs") fetchLogs();
  };

  const filteredLogs = useMemo(() => {
    if (!logSearch) return logs;
    const q = logSearch.toLowerCase();
    return logs.filter((l) => l.event_name.toLowerCase().includes(q) || l.event_id.toLowerCase().includes(q));
  }, [logs, logSearch]);

  if (loading || !config) return <p className="text-muted-foreground text-center py-12">Laden...</p>;

  const labels = config.google_ads_conversion_labels || { ...defaultLabels };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        {(["config", "logs", "test"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 text-sm font-display tracking-wider rounded-md transition-colors ${activeTab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t === "config" ? "KONFIGURATION" : t === "logs" ? "EVENT LOGS" : "TEST EVENTS"}
          </button>
        ))}
      </div>

      {/* ── CONFIG TAB ── */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {/* GTM */}
          <Section title="GOOGLE TAG MANAGER">
            <Toggle label="GTM aktiv" checked={config.gtm_active} onChange={(v) => update("gtm_active", v)} />
            {config.gtm_active && <Field label="Container ID" value={config.gtm_container_id} onChange={(v) => update("gtm_container_id", v)} placeholder="GTM-XXXXXXX" />}
          </Section>

          {/* Meta */}
          <Section title="META (FACEBOOK / INSTAGRAM)">
            <Toggle label="Pixel aktiv" checked={config.meta_pixel_active} onChange={(v) => update("meta_pixel_active", v)} />
            {config.meta_pixel_active && (
              <>
                <Field label="Pixel ID" value={config.meta_pixel_id} onChange={(v) => update("meta_pixel_id", v)} placeholder="123456789" />
                <Toggle label="Advanced Matching" checked={config.meta_advanced_matching} onChange={(v) => update("meta_advanced_matching", v)} />
              </>
            )}
            <Toggle label="Conversions API (CAPI) aktiv" checked={config.meta_capi_active} onChange={(v) => update("meta_capi_active", v)} />
            {config.meta_capi_active && (
              <>
                <Field label="Access Token" value={config.meta_access_token} onChange={(v) => update("meta_access_token", v)} type="password" />
                <Field label="Dataset ID (Pixel ID)" value={config.meta_dataset_id} onChange={(v) => update("meta_dataset_id", v)} />
                <Field label="Test Event Code (optional)" value={config.meta_test_event_code} onChange={(v) => update("meta_test_event_code", v)} placeholder="TEST12345" />
              </>
            )}
          </Section>

          {/* TikTok */}
          <Section title="TIKTOK">
            <Toggle label="Pixel aktiv" checked={config.tiktok_pixel_active} onChange={(v) => update("tiktok_pixel_active", v)} />
            {config.tiktok_pixel_active && (
              <Field label="Pixel ID" value={config.tiktok_pixel_id} onChange={(v) => update("tiktok_pixel_id", v)} />
            )}
            <Toggle label="Events API aktiv" checked={config.tiktok_events_api_active} onChange={(v) => update("tiktok_events_api_active", v)} />
            {config.tiktok_events_api_active && (
              <Field label="Access Token" value={config.tiktok_access_token} onChange={(v) => update("tiktok_access_token", v)} type="password" />
            )}
          </Section>

          {/* Snapchat */}
          <Section title="SNAPCHAT">
            <Toggle label="Pixel aktiv" checked={config.snapchat_pixel_active} onChange={(v) => update("snapchat_pixel_active", v)} />
            {config.snapchat_pixel_active && (
              <Field label="Pixel ID" value={config.snapchat_pixel_id} onChange={(v) => update("snapchat_pixel_id", v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx" />
            )}
            <Toggle label="Conversions API (CAPI) aktiv" checked={config.snapchat_capi_active} onChange={(v) => update("snapchat_capi_active", v)} />
            {config.snapchat_capi_active && (
              <Field label="Access Token" value={config.snapchat_access_token} onChange={(v) => update("snapchat_access_token", v)} type="password" />
            )}
          </Section>

          {/* Pinterest */}
          <Section title="PINTEREST">
            <Toggle label="Tag aktiv" checked={config.pinterest_tag_active} onChange={(v) => update("pinterest_tag_active", v)} />
            {config.pinterest_tag_active && (
              <Field label="Tag ID" value={config.pinterest_tag_id} onChange={(v) => update("pinterest_tag_id", v)} placeholder="123456789" />
            )}
            <Toggle label="Conversions API aktiv" checked={config.pinterest_capi_active} onChange={(v) => update("pinterest_capi_active", v)} />
            {config.pinterest_capi_active && (
              <Field label="Access Token" value={config.pinterest_access_token} onChange={(v) => update("pinterest_access_token", v)} type="password" />
            )}
          </Section>

          {/* LinkedIn */}
          <Section title="LINKEDIN">
            <Toggle label="Insight Tag aktiv" checked={config.linkedin_insight_active} onChange={(v) => update("linkedin_insight_active", v)} />
            {config.linkedin_insight_active && (
              <Field label="Partner ID" value={config.linkedin_partner_id} onChange={(v) => update("linkedin_partner_id", v)} placeholder="123456" />
            )}
            <Toggle label="Conversions API aktiv" checked={config.linkedin_capi_active} onChange={(v) => update("linkedin_capi_active", v)} />
            {config.linkedin_capi_active && (
              <Field label="Access Token" value={config.linkedin_access_token} onChange={(v) => update("linkedin_access_token", v)} type="password" />
            )}
          </Section>

          {/* Google */}
          <Section title="GOOGLE ANALYTICS & ADS">
            <Toggle label="GA4 aktiv" checked={config.ga4_active} onChange={(v) => update("ga4_active", v)} />
            {config.ga4_active && (
              <Field label="Measurement ID" value={config.ga4_measurement_id} onChange={(v) => update("ga4_measurement_id", v)} placeholder="G-XXXXXXXXXX" />
            )}
            <Toggle label="Google Ads aktiv" checked={config.google_ads_active} onChange={(v) => update("google_ads_active", v)} />
            {config.google_ads_active && (
              <>
                <Field label="Conversion ID" value={config.google_ads_conversion_id} onChange={(v) => update("google_ads_conversion_id", v)} placeholder="AW-XXXXXXXXX" />
                <p className="text-xs text-muted-foreground mt-2">Conversion Labels pro Event:</p>
                {Object.keys(defaultLabels).map((key) => (
                  <Field key={key} label={key} value={labels[key] || ""}
                    onChange={(v) => update("google_ads_conversion_labels", { ...labels, [key]: v })}
                    placeholder="Label z.B. aBcDeFgHiJk" />
                ))}
              </>
            )}
            <Toggle label="Enhanced Conversions" checked={config.google_enhanced_conversions} onChange={(v) => update("google_enhanced_conversions", v)} />
            <Toggle label="Server-Backup (Measurement Protocol)" checked={config.google_server_backup} onChange={(v) => update("google_server_backup", v)} />
            {config.google_server_backup && (
              <Field label="GA4 API Secret" value={config.ga4_api_secret} onChange={(v) => update("ga4_api_secret", v)} type="password" />
            )}
          </Section>

          {/* Consent */}
          <Section title="CONSENT MODE (EU)">
            <Toggle label="Consent-System aktiv" checked={config.consent_active} onChange={(v) => update("consent_active", v)} />
            {config.consent_active && (
              <Toggle label="Consent Mode v2" checked={config.consent_mode_v2} onChange={(v) => update("consent_mode_v2", v)} />
            )}
          </Section>

          {/* Debug */}
          <Section title="DEBUG" icon={<Bug size={16} />}>
            <Toggle label="Debug Mode (Console Logging)" checked={config.debug_mode} onChange={(v) => update("debug_mode", v)} />
          </Section>

          {/* Save */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save size={16} /> {saving ? "SPEICHERN..." : "SPEICHERN"}
            </button>
            <button onClick={fetchConfig} className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">
              <RotateCcw size={16} /> ZURÜCKSETZEN
            </button>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {activeTab === "logs" && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={logSearch} onChange={(e) => setLogSearch(e.target.value)} placeholder="Event suchen..."
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <button onClick={fetchLogs} className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>

          {logsLoading ? (
            <p className="text-muted-foreground text-center py-12">Laden...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Keine Events geloggt.</p>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div key={log.id} className="glass-card p-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === "sent" ? "bg-green-400" : "bg-destructive"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground text-sm font-medium">{log.event_name}</span>
                      {(log.platforms as any as string[])?.map((p: string) => (
                        <span key={p} className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs truncate">
                      {log.event_id} · {new Date(log.created_at).toLocaleString("de-DE")}
                    </p>
                    {log.error_message && <p className="text-destructive text-xs">{log.error_message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TEST TAB ── */}
      {activeTab === "test" && (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Sende Test-Events an alle aktiven Plattformen. Events werden im Log gespeichert.</p>

          {/* Platform status */}
          <Section title="PLATTFORM STATUS" icon={<Activity size={16} />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "GTM", active: config.gtm_active },
                { name: "Meta Pixel", active: config.meta_pixel_active },
                { name: "Meta CAPI", active: config.meta_capi_active },
                { name: "TikTok Pixel", active: config.tiktok_pixel_active },
                { name: "TikTok API", active: config.tiktok_events_api_active },
                { name: "Snapchat Pixel", active: config.snapchat_pixel_active },
                { name: "Snapchat CAPI", active: config.snapchat_capi_active },
                { name: "Pinterest Tag", active: config.pinterest_tag_active },
                { name: "Pinterest CAPI", active: config.pinterest_capi_active },
                { name: "LinkedIn Insight", active: config.linkedin_insight_active },
                { name: "LinkedIn CAPI", active: config.linkedin_capi_active },
                { name: "GA4", active: config.ga4_active },
                { name: "Google Ads", active: config.google_ads_active },
                { name: "Server Backup", active: config.google_server_backup },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${p.active ? "bg-green-400" : "bg-muted-foreground"}`} />
                  <span className={p.active ? "text-foreground" : "text-muted-foreground"}>{p.name}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Test buttons */}
          <Section title="TEST EVENTS SENDEN">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {["PageView", "ViewEvent", "SelectTicket", "AddToCart", "ViewCart", "InitiateCheckout", "AddPaymentInfo", "PaymentStart", "Purchase", "Lead"].map((ev) => (
                <button key={ev} onClick={() => sendTestEvent(ev)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-muted border border-border text-foreground rounded-md hover:border-primary hover:text-primary transition-colors text-xs font-display tracking-wider">
                  <Play size={12} /> {ev}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
};

export default AdminTracking;
