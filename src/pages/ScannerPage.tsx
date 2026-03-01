import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, CheckCircle, XCircle, RotateCcw, Users } from "lucide-react";

interface ScannedTicket {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  quantity: number;
  checked_in: boolean;
  event_title?: string;
  ticket_type_name?: string;
}

const ScannerPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState<{ status: "success" | "error" | "already"; ticket?: ScannedTicket; message: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count: total } = await supabase.from("tickets").select("*", { count: "exact", head: true });
    const { count: checkedIn } = await supabase.from("tickets").select("*", { count: "exact", head: true }).eq("checked_in", true);
    setStats({ total: total || 0, checkedIn: checkedIn || 0 });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const handleScan = async (code: string) => {
    if (!code.trim()) return;
    
    // Find ticket by qr_code
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_code", code.trim())
      .maybeSingle();

    if (!ticket || error) {
      setResult({ status: "error", message: "❌ Ticket nicht gefunden!" });
      return;
    }

    const t = ticket as unknown as ScannedTicket & { checked_in: boolean; event_id: string; ticket_type_id: string | null };

    if (t.checked_in) {
      setResult({ status: "already", ticket: t, message: "⚠️ Ticket bereits eingecheckt!" });
      return;
    }

    // Check in
    await supabase.from("tickets").update({ checked_in: true, checked_in_at: new Date().toISOString() }).eq("id", t.id);

    setResult({
      status: "success",
      ticket: t,
      message: `✅ ${t.buyer_name || t.buyer_email} eingecheckt!`,
    });

    fetchStats();
    setQrInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(qrInput);
  };

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-wider text-foreground">
            TICKET <span className="text-gradient">SCANNER</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 glass-card p-4 text-center">
            <Users size={20} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.checkedIn}</p>
            <p className="text-xs text-muted-foreground">Eingecheckt</p>
          </div>
          <div className="flex-1 glass-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </div>
        </div>

        {/* Scan input */}
        <form onSubmit={handleSubmit} className="glass-card p-6 mb-6">
          <label className="text-sm text-foreground mb-2 block">QR-Code scannen oder eingeben:</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="TKT-..."
              className="flex-1 px-4 py-3 bg-muted border border-border rounded-md text-foreground font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              autoFocus
            />
            <button type="submit" className="px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90">
              CHECK
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div className={`glass-card p-6 text-center animate-fade-in ${
            result.status === "success" ? "border-2 border-green-500" :
            result.status === "already" ? "border-2 border-yellow-500" :
            "border-2 border-destructive"
          }`}>
            <div className="text-4xl mb-2">
              {result.status === "success" ? <CheckCircle size={48} className="mx-auto text-green-500" /> :
               result.status === "already" ? <RotateCcw size={48} className="mx-auto text-yellow-500" /> :
               <XCircle size={48} className="mx-auto text-destructive" />}
            </div>
            <p className="font-display text-xl tracking-wider text-foreground">{result.message}</p>
            {result.ticket && (
              <div className="mt-3 text-sm text-muted-foreground">
                <p>{result.ticket.buyer_name}</p>
                <p>{result.ticket.buyer_email}</p>
                <p>{result.ticket.quantity}× Tickets</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ScannerPage;
