import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Building2, CreditCard, Hash, Globe, Phone, Mail } from "lucide-react";

interface InvoiceConfig {
  id: string;
  company_name: string;
  company_address: string;
  company_zip: string;
  company_city: string;
  company_country: string;
  tax_id: string | null;
  vat_id: string | null;
  bank_name: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  invoice_prefix: string;
  next_invoice_number: number;
  logo_url: string | null;
  footer_text: string | null;
}

const inputCls =
  "w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none";

const AdminInvoiceConfig = () => {
  const [config, setConfig] = useState<InvoiceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("invoice_config")
        .select("*")
        .limit(1)
        .single();
      if (data) setConfig(data as unknown as InvoiceConfig);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { id, ...rest } = config;
    const { error } = await supabase
      .from("invoice_config")
      .update(rest as any)
      .eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success("Rechnungskonfiguration gespeichert!");
    }
    setSaving(false);
  };

  const update = (field: keyof InvoiceConfig, value: string | number | null) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) return <p className="text-muted-foreground py-8 text-center">Laden...</p>;
  if (!config) return <p className="text-muted-foreground py-8 text-center">Keine Konfiguration gefunden.</p>;

  return (
    <div className="space-y-6">
      {/* Company */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-primary" /> FIRMENDATEN
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-foreground mb-1 block">Firmenname *</label>
            <input
              value={config.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Adresse *</label>
            <input
              value={config.company_address}
              onChange={(e) => update("company_address", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">PLZ *</label>
            <input
              value={config.company_zip}
              onChange={(e) => update("company_zip", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Stadt *</label>
            <input
              value={config.company_city}
              onChange={(e) => update("company_city", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Land</label>
            <input
              value={config.company_country}
              onChange={(e) => update("company_country", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Steuer-Nr.</label>
            <input
              value={config.tax_id || ""}
              onChange={(e) => update("tax_id", e.target.value || null)}
              placeholder="z.B. 12/345/67890"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">USt-IdNr.</label>
            <input
              value={config.vat_id || ""}
              onChange={(e) => update("vat_id", e.target.value || null)}
              placeholder="z.B. DE123456789"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4 flex items-center gap-2">
          <Globe size={18} className="text-primary" /> KONTAKT
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-foreground mb-1 block flex items-center gap-1">
              <Mail size={12} /> E-Mail
            </label>
            <input
              value={config.email || ""}
              onChange={(e) => update("email", e.target.value || null)}
              type="email"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block flex items-center gap-1">
              <Phone size={12} /> Telefon
            </label>
            <input
              value={config.phone || ""}
              onChange={(e) => update("phone", e.target.value || null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Website</label>
            <input
              value={config.website || ""}
              onChange={(e) => update("website", e.target.value || null)}
              placeholder="https://"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Bank */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-primary" /> BANKDATEN
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-foreground mb-1 block">Bankname</label>
            <input
              value={config.bank_name || ""}
              onChange={(e) => update("bank_name", e.target.value || null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">IBAN</label>
            <input
              value={config.bank_iban || ""}
              onChange={(e) => update("bank_iban", e.target.value || null)}
              placeholder="DE89 3704 0044 0532 0130 00"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">BIC</label>
            <input
              value={config.bank_bic || ""}
              onChange={(e) => update("bank_bic", e.target.value || null)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Invoice numbering */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4 flex items-center gap-2">
          <Hash size={18} className="text-primary" /> NUMMERNKREIS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-foreground mb-1 block">Rechnungspräfix</label>
            <input
              value={config.invoice_prefix}
              onChange={(e) => update("invoice_prefix", e.target.value)}
              placeholder="INV"
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Beispiel: {config.invoice_prefix}-{new Date().getFullYear()}-{String(config.next_invoice_number).padStart(5, "0")}
            </p>
          </div>
          <div>
            <label className="text-sm text-foreground mb-1 block">Nächste Rechnungsnummer</label>
            <input
              type="number"
              min={1}
              value={config.next_invoice_number}
              onChange={(e) => update("next_invoice_number", parseInt(e.target.value) || 1)}
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wird automatisch hochgezählt bei jeder Rechnungserstellung.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg tracking-wider text-foreground mb-4">
          FUSSZEILE
        </h3>
        <div>
          <label className="text-sm text-foreground mb-1 block">Fußtext auf Rechnung</label>
          <textarea
            value={config.footer_text || ""}
            onChange={(e) => update("footer_text", e.target.value || null)}
            rows={2}
            placeholder="z.B. Vielen Dank für Ihren Einkauf!"
            className={inputCls + " resize-y"}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save size={18} /> {saving ? "SPEICHERN..." : "SPEICHERN"}
        </button>
      </div>
    </div>
  );
};

export default AdminInvoiceConfig;
