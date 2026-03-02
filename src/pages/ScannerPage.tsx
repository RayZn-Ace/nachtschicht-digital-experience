import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Camera, CameraOff, CheckCircle, XCircle, AlertTriangle,
  Users, Keyboard, ScanLine, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TicketResult {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  quantity: number;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  ticket_type?: string;
  qr_code?: string;
  checked_in_at?: string;
  total_price?: number;
}

type ScanStatus = "success" | "already_redeemed" | "cancelled" | "invalid";

interface ScanResult {
  status: ScanStatus;
  message: string;
  ticket?: TicketResult;
}

// Audio feedback using Web Audio API
const playSound = (type: "success" | "error") => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Audio not available
  }
};

const ScannerPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [events, setEvents] = useState<{ id: string; title: string; date: string }[]>([]);

  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoResetTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastScanned = useRef<string>("");

  const fetchStats = useCallback(async () => {
    const eventFilter = selectedEvent !== "all" ? selectedEvent : undefined;
    let totalQuery = supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "confirmed");
    let checkedQuery = supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "confirmed").eq("checked_in", true);
    if (eventFilter) {
      totalQuery = totalQuery.eq("event_id", eventFilter);
      checkedQuery = checkedQuery.eq("event_id", eventFilter);
    }
    const [{ count: total }, { count: checkedIn }] = await Promise.all([totalQuery, checkedQuery]);
    setStats({ total: total || 0, checkedIn: checkedIn || 0 });
  }, [selectedEvent]);

  useEffect(() => {
    fetchStats();
    supabase.from("events").select("id, title, date").eq("is_published", true).order("date", { ascending: false })
      .then(({ data }) => { if (data) setEvents(data); });
  }, [fetchStats]);

  const handleCheckIn = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || processing) return;
    // Prevent double-scan of same code within 3s
    if (trimmed === lastScanned.current) return;
    lastScanned.current = trimmed;
    setTimeout(() => { lastScanned.current = ""; }, 3000);

    setProcessing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        toast.error("Nicht angemeldet");
        setProcessing(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-in-ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ qr_code: trimmed }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setResult({ status: "invalid", message: data.error });
        playSound("error");
      } else {
        setResult(data as ScanResult);
        playSound(data.status === "success" ? "success" : "error");
        if (data.status === "success") fetchStats();
      }
    } catch (err) {
      setResult({ status: "invalid", message: "Netzwerkfehler" });
      playSound("error");
    } finally {
      setProcessing(false);
      setManualInput("");
      // Auto-reset after 3 seconds
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
      autoResetTimer.current = setTimeout(() => {
        setResult(null);
      }, 3000);
    }
  }, [processing, fetchStats]);

  // Camera scanner
  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText: string) => {
          handleCheckIn(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Kamera konnte nicht gestartet werden. Bitte Berechtigung erteilen.");
      setCameraActive(false);
    }
  }, [handleCheckIn]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
    };
  }, [stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheckIn(manualInput);
  };

  const dismissResult = () => {
    setResult(null);
    if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const percentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  // Full-screen result overlay
  if (result) {
    const isSuccess = result.status === "success";
    const isAlready = result.status === "already_redeemed";
    const isCancelled = result.status === "cancelled";

    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-colors ${
          isSuccess
            ? "bg-green-600"
            : isAlready
            ? "bg-yellow-600"
            : "bg-red-600"
        }`}
        onClick={dismissResult}
      >
        <div className="text-white text-center space-y-4 max-w-md animate-fade-in">
          {isSuccess ? (
            <CheckCircle size={96} className="mx-auto" />
          ) : isAlready ? (
            <AlertTriangle size={96} className="mx-auto" />
          ) : (
            <XCircle size={96} className="mx-auto" />
          )}

          <h1 className="font-display text-4xl md:text-5xl tracking-wider">
            {isSuccess ? "VALID ✓" : isAlready ? "BEREITS GESCANNT" : isCancelled ? "STORNIERT" : "UNGÜLTIG"}
          </h1>

          <p className="text-xl opacity-90">{result.message}</p>

          {result.ticket && (
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-left space-y-2">
              {result.ticket.event_title && (
                <div>
                  <p className="text-xs opacity-70">Event</p>
                  <p className="font-bold text-lg">{result.ticket.event_title}</p>
                </div>
              )}
              {result.ticket.ticket_type && (
                <div>
                  <p className="text-xs opacity-70">Ticket-Typ</p>
                  <p className="font-medium">{result.ticket.ticket_type}</p>
                </div>
              )}
              {result.ticket.buyer_name && (
                <div>
                  <p className="text-xs opacity-70">Name</p>
                  <p className="font-medium">{result.ticket.buyer_name}</p>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <p className="text-xs opacity-70">Anzahl</p>
                  <p className="font-bold text-lg">{result.ticket.quantity}×</p>
                </div>
                {result.ticket.checked_in_at && isAlready && (
                  <div>
                    <p className="text-xs opacity-70">Eingecheckt um</p>
                    <p className="font-medium">{new Date(result.ticket.checked_in_at).toLocaleTimeString("de-DE")}</p>
                  </div>
                )}
              </div>
              {isSuccess && (
                <div className="pt-2 border-t border-white/30">
                  <p className="text-sm font-medium">Status: VALID → REDEEMED ✓</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={dismissResult}
            className="mt-6 px-8 py-3 bg-white/20 backdrop-blur rounded-lg font-display tracking-wider text-lg hover:bg-white/30 transition-colors"
          >
            <RotateCcw size={18} className="inline mr-2" />
            NÄCHSTES TICKET SCANNEN
          </button>

          <p className="text-xs opacity-50 mt-2">Automatischer Reset in 3 Sekunden…</p>
        </div>
      </div>
    );
  }

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-6">
          <h1 className="font-display text-4xl tracking-wider text-foreground">
            TICKET <span className="text-gradient">SCANNER</span>
          </h1>
        </div>

        {/* Event filter */}
        <div className="mb-4">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm"
          >
            <option value="all">Alle Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} – {new Date(ev.date).toLocaleDateString("de-DE")}
              </option>
            ))}
          </select>
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
          <div className="flex-1 glass-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{percentage}%</p>
            <p className="text-xs text-muted-foreground">Quote</p>
          </div>
        </div>

        {/* Camera Scanner */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
              <ScanLine size={18} /> KAMERA-SCAN
            </h2>
            <Button
              variant={cameraActive ? "destructive" : "default"}
              size="sm"
              onClick={cameraActive ? stopCamera : startCamera}
              className="font-display tracking-wider gap-1.5"
            >
              {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
              {cameraActive ? "STOP" : "START"}
            </Button>
          </div>

          <div
            id="qr-reader"
            ref={videoRef}
            className={`w-full rounded-lg overflow-hidden bg-black/50 ${cameraActive ? "min-h-[300px]" : "h-32 flex items-center justify-center"}`}
          >
            {!cameraActive && (
              <p className="text-muted-foreground text-sm text-center">
                Kamera starten um QR-Codes zu scannen
              </p>
            )}
          </div>

          {processing && (
            <div className="mt-3 text-center text-sm text-muted-foreground animate-pulse">
              Wird geprüft...
            </div>
          )}
        </div>

        {/* Manual input */}
        <div className="glass-card p-4">
          <button
            onClick={() => {
              setShowManual(!showManual);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="flex items-center gap-2 w-full text-left font-display tracking-wider text-foreground text-sm"
          >
            <Keyboard size={16} />
            MANUELL EINGEBEN
            <span className="text-muted-foreground text-xs ml-auto">{showManual ? "▲" : "▼"}</span>
          </button>

          {showManual && (
            <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
              <Input
                ref={inputRef}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="QR-Code oder Ticket-Nr. eingeben..."
                className="bg-secondary border-border font-mono text-sm"
                autoFocus
              />
              <Button type="submit" disabled={processing} className="font-display tracking-wider shrink-0">
                CHECK
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ScannerPage;
