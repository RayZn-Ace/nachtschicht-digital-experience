import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Camera, CameraOff, CheckCircle, XCircle, AlertTriangle,
  Users, Keyboard, ScanLine, RotateCcw, WifiOff, Wifi, CloudUpload, Trash2
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
  event_id?: string;
  ticket_type?: string;
  qr_code?: string;
  checked_in_at?: string;
  total_price?: number;
}

type ScanStatus = "success" | "already_redeemed" | "cancelled" | "invalid" | "wrong_event";

interface ScanResult {
  status: ScanStatus;
  message: string;
  ticket?: TicketResult;
}

interface QueuedCheckIn {
  id: string;
  qr_code: string;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = "nachtschicht_offline_checkins";

const loadQueue = (): QueuedCheckIn[] => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
};
const saveQueue = (queue: QueuedCheckIn[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
const addToQueue = (qr_code: string): QueuedCheckIn => {
  const queue = loadQueue();
  const item: QueuedCheckIn = { id: crypto.randomUUID(), qr_code, timestamp: Date.now(), retries: 0 };
  queue.push(item);
  saveQueue(queue);
  return item;
};
const removeFromQueue = (id: string) => saveQueue(loadQueue().filter((q) => q.id !== id));

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
  } catch {}
};

// Vibrate helper for mobile haptic feedback
const vibrate = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch {}
};

const ScannerPage = forwardRef<HTMLDivElement>((_, ref) => {
  const { user, isAdmin, loading } = useAuth();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [manualInput, setManualInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [events, setEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedCheckIn[]>(loadQueue);
  const [syncing, setSyncing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoResetTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastScanned = useRef<string>("");
  const processingRef = useRef(false);
  const syncInterval = useRef<ReturnType<typeof setInterval>>();
  // Use a ref for the latest handleCheckIn to avoid stale closures in html5-qrcode callback
  const handleCheckInRef = useRef<(code: string) => Promise<void>>();

  // Keep processingRef in sync
  useEffect(() => { processingRef.current = processing; }, [processing]);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); toast.success("Verbindung wiederhergestellt", { icon: <Wifi size={16} /> }); };
    const goOffline = () => { setIsOnline(false); toast.warning("Offline – Check-ins werden lokal gespeichert", { icon: <WifiOff size={16} />, duration: 5000 }); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const eventFilter = selectedEvent !== "all" ? selectedEvent : undefined;
      let totalQuery = supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "confirmed");
      let checkedQuery = supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "confirmed").eq("checked_in", true);
      if (eventFilter) {
        totalQuery = totalQuery.eq("event_id", eventFilter);
        checkedQuery = checkedQuery.eq("event_id", eventFilter);
      }
      const [{ count: total }, { count: checkedIn }] = await Promise.all([totalQuery, checkedQuery]);
      setStats({ total: total || 0, checkedIn: checkedIn || 0 });
    } catch (err) {
      console.error("fetchStats error:", err);
    }
  }, [selectedEvent]);

  // Auto-sync queue
  const syncQueue = useCallback(async () => {
    const currentQueue = loadQueue();
    if (currentQueue.length === 0 || !navigator.onLine) return;
    setSyncing(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) { setSyncing(false); return; }

    let successCount = 0;
    for (const item of currentQueue) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-in-ticket`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ qr_code: item.qr_code }) }
        );
        const data = await res.json();
        if (data.status === "success" || data.status === "already_redeemed") {
          removeFromQueue(item.id);
          successCount++;
        } else {
          const q = loadQueue();
          const idx = q.findIndex((x) => x.id === item.id);
          if (idx >= 0) { q[idx].retries++; if (q[idx].retries >= 5) q.splice(idx, 1); saveQueue(q); }
        }
      } catch { break; }
    }
    setQueue(loadQueue());
    setSyncing(false);
    if (successCount > 0) { toast.success(`${successCount} Offline-Check-in${successCount > 1 ? "s" : ""} synchronisiert ✓`); fetchStats(); }
  }, [fetchStats]);

  useEffect(() => { if (isOnline && queue.length > 0) syncQueue(); }, [isOnline, syncQueue]);
  useEffect(() => {
    syncInterval.current = setInterval(() => { if (navigator.onLine && loadQueue().length > 0) syncQueue(); }, 30000);
    return () => { if (syncInterval.current) clearInterval(syncInterval.current); };
  }, [syncQueue]);

  useEffect(() => {
    fetchStats();
    supabase.from("events").select("id, title, date").eq("is_published", true).order("date", { ascending: false })
      .then(({ data }) => { if (data) setEvents(data); });
  }, [fetchStats]);

  // Core check-in logic
  const handleCheckIn = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || processingRef.current) return;
    if (trimmed === lastScanned.current) return;
    lastScanned.current = trimmed;
    setTimeout(() => { lastScanned.current = ""; }, 3000);

    setProcessing(true);

    // Offline path
    if (!navigator.onLine) {
      addToQueue(trimmed);
      setQueue(loadQueue());
      setResult({ status: "success", message: "Offline gespeichert – wird synchronisiert sobald Verbindung besteht" });
      playSound("success");
      vibrate(100);
      setProcessing(false);
      setManualInput("");
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
      autoResetTimer.current = setTimeout(() => setResult(null), 3000);
      return;
    }

    // Online path
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { toast.error("Nicht angemeldet"); setProcessing(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-in-ticket`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ qr_code: trimmed, expected_event_id: selectedEvent !== "all" ? selectedEvent : undefined }) }
      );

      const data = await res.json();
      if (data.error) {
        setResult({ status: "invalid", message: data.error });
        playSound("error");
        vibrate([100, 50, 100]);
      } else {
        const scanData = data as ScanResult;
        setResult(scanData);
        if (scanData.status === "success") {
          playSound("success");
          vibrate(100);
          fetchStats();
        } else {
          playSound("error");
          vibrate([100, 50, 100]);
        }
      }
    } catch {
      addToQueue(trimmed);
      setQueue(loadQueue());
      setResult({ status: "success", message: "Verbindung verloren – Check-in offline gespeichert" });
      playSound("success");
      vibrate(100);
    } finally {
      setProcessing(false);
      setManualInput("");
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
      autoResetTimer.current = setTimeout(() => setResult(null), 3000);
    }
  }, [fetchStats, selectedEvent]);

  // Keep ref updated so camera callback always calls latest version
  useEffect(() => { handleCheckInRef.current = handleCheckIn; }, [handleCheckIn]);

  // Camera scanner - uses ref-based callback to avoid stale closures
  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;

      const containerEl = document.getElementById("qr-reader");
      const containerWidth = containerEl ? containerEl.clientWidth : Math.min(window.innerWidth - 48, 420);
      const qrSize = Math.max(Math.floor(containerWidth * 0.72), 200);

      const onScanSuccess = (decodedText: string) => {
        handleCheckInRef.current?.(decodedText);
      };

      const onScanError = () => {};

      const scanConfig = {
        fps: 12,
        qrbox: { width: qrSize, height: qrSize },
        disableFlip: false,
      };

      let started = false;

      // 1) Try preferred rear camera by deviceId (best mobile compatibility)
      try {
        const cameras = await Html5Qrcode.getCameras();
        const preferredCamera =
          cameras.find((c: any) => /back|rear|environment|hinten|rück/i.test(c.label || "")) || cameras[0];

        if (preferredCamera?.id) {
          await scanner.start(preferredCamera.id, scanConfig, onScanSuccess, onScanError);
          started = true;
        }
      } catch {
        // fallback below
      }

      // 2) Fallback: facingMode constraint
      if (!started) {
        await scanner.start({ facingMode: { ideal: "environment" } }, scanConfig, onScanSuccess, onScanError);
        started = true;
      }

      // Ensure iOS Safari renders camera inline (prevents black fullscreen-like preview)
      let attempts = 0;
      const forceInlineVideo = () => {
        const videoEl = containerEl?.querySelector("video") as HTMLVideoElement | null;
        if (!videoEl) return false;

        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("webkit-playsinline", "true");
        videoEl.setAttribute("autoplay", "true");
        videoEl.setAttribute("muted", "true");

        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
        videoEl.style.borderRadius = "0.5rem";

        void videoEl.play().catch(() => {});

        const extraDivs = containerEl?.querySelectorAll("img[alt='Info icon'], a[href]");
        extraDivs?.forEach((el) => ((el as HTMLElement).style.display = "none"));

        return true;
      };

      const inlineTimer = window.setInterval(() => {
        attempts += 1;
        const ok = forceInlineVideo();
        if (ok || attempts > 25) window.clearInterval(inlineTimer);
      }, 120);

      setTimeout(() => window.clearInterval(inlineTimer), 4000);

      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      const msg = typeof err === "string" ? err : err?.message || "Unbekannter Fehler";

      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setCameraError("Kamera-Zugriff verweigert. Bitte erlaube den Kamerazugriff in den Browser-Einstellungen.");
      } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
        setCameraError("Keine Kamera gefunden. Nutze die manuelle Eingabe.");
      } else if (msg.includes("NotReadableError") || msg.includes("Could not start")) {
        setCameraError("Kamera wird von einer anderen App verwendet. Bitte schließe andere Apps und versuche es erneut.");
      } else {
        setCameraError(`Kamera-Fehler: ${msg}`);
      }

      setCameraActive(false);
      scannerRef.current = null;
      setShowManual(true);
    }
  }, []);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === 2 /* SCANNING */) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn("stopCamera warning:", e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
    };
  }, [stopCamera]);

  // Keep screen awake while camera is active (if supported)
  useEffect(() => {
    let wakeLock: any = null;
    if (cameraActive && "wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen").then((wl: any) => { wakeLock = wl; }).catch(() => {});
    }
    return () => { wakeLock?.release?.(); };
  }, [cameraActive]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheckIn(manualInput);
  };

  const dismissResult = () => {
    setResult(null);
    if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
  };

  const clearQueue = () => {
    saveQueue([]);
    setQueue([]);
    toast.info("Offline-Warteschlange geleert");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground">
        <div className="animate-pulse text-center">
          <ScanLine size={48} className="mx-auto mb-3 text-primary" />
          <p>Scanner wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const percentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;


  return (
    <section className="pb-6 pt-4 px-4 md:section-padding" ref={ref}>
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-4">
          <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
            TICKET <span className="text-gradient">SCANNER</span>
          </h1>
        </div>

        {/* Online/Offline indicator */}
        <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-sm font-medium ${
          isOnline
            ? "bg-green-500/10 text-green-400 border border-green-500/20"
            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        }`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span className="truncate">
            {isOnline ? "Online – Check-ins sofort" : "Offline – lokal zwischengespeichert"}
          </span>
        </div>

        {/* Offline queue banner */}
        {queue.length > 0 && (
          <div className="mb-3 glass-card p-3 border border-yellow-500/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display tracking-wider text-xs text-foreground flex items-center gap-2">
                <CloudUpload size={14} className="text-yellow-400" />
                WARTESCHLANGE ({queue.length})
              </h3>
              <div className="flex gap-1.5">
                {isOnline && (
                  <Button size="sm" variant="outline" onClick={syncQueue} disabled={syncing} className="text-xs gap-1 h-7 px-2">
                    <CloudUpload size={12} />
                    {syncing ? "..." : "Sync"}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={clearQueue} className="text-xs text-muted-foreground hover:text-destructive gap-1 h-7 px-2">
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs bg-white/5 rounded px-2 py-1">
                  <span className="font-mono text-muted-foreground truncate max-w-[160px]">{item.qr_code}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Date(item.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event filter */}
        <div className="mb-3">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm min-h-[44px]"
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
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="glass-card p-3 text-center">
            <Users size={18} className="mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-foreground">{stats.checkedIn}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eingecheckt</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xl font-bold text-foreground mt-5">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gesamt</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-xl font-bold text-primary mt-5">{percentage}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quote</p>
          </div>
        </div>

        {/* Camera Scanner */}
        <div className="glass-card p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-sm tracking-wider text-foreground flex items-center gap-2">
              <ScanLine size={16} /> KAMERA-SCAN
            </h2>
            <Button
              variant={cameraActive ? "destructive" : "default"}
              size="sm"
              onClick={cameraActive ? stopCamera : startCamera}
              className="font-display tracking-wider gap-1.5 min-h-[44px] px-4"
              style={{ touchAction: "manipulation" }}
            >
              {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
              {cameraActive ? "STOP" : "START"}
            </Button>
          </div>

          {cameraError && (
            <div className="mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
              {cameraError}
            </div>
          )}

          <div className="relative w-full overflow-hidden rounded-lg">
            <div
              id="qr-reader"
              ref={videoRef}
              className={`w-full overflow-hidden bg-black/50 transition-all duration-300 ${
                cameraActive ? "aspect-square" : "h-32"
              }`}
              style={cameraActive ? { minHeight: "340px" } : undefined}
            />

            {/* Inline scan result overlay – must be AFTER qr-reader to stack on top */}
            {result && (
              <div
                className={`absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-lg ${
                  result.status === "success"
                    ? "bg-green-500/95 ring-4 ring-green-400"
                    : result.status === "wrong_event"
                    ? "bg-yellow-500/95 ring-4 ring-yellow-400"
                    : result.status === "already_redeemed"
                    ? "bg-gradient-to-b from-red-600/95 to-orange-600/95 ring-4 ring-orange-500"
                    : "bg-red-600/95 ring-4 ring-red-500"
                } animate-fade-in cursor-pointer`}
                onClick={dismissResult}
                style={{ touchAction: "manipulation" }}
              >
                <div className="text-white text-center space-y-2 px-4">
                  {result.status === "success" ? (
                    <CheckCircle size={48} className="mx-auto text-white drop-shadow-lg" />
                  ) : result.status === "wrong_event" ? (
                    <AlertTriangle size={48} className="mx-auto text-white drop-shadow-lg" />
                  ) : (
                    <XCircle size={48} className="mx-auto text-white drop-shadow-lg" />
                  )}
                  <h2 className="font-display text-2xl tracking-wider drop-shadow-md">
                    {result.status === "success"
                      ? "VALID ✓"
                      : result.status === "wrong_event"
                      ? "FALSCHES EVENT"
                      : result.status === "already_redeemed"
                      ? "BEREITS GESCANNT"
                      : result.status === "cancelled"
                      ? "STORNIERT"
                      : "UNGÜLTIG"}
                  </h2>
                  {result.ticket?.event_title && (
                    <p className="text-sm font-medium bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 inline-block">
                      {result.ticket.event_title}
                    </p>
                  )}
                  {result.ticket?.buyer_name && (
                    <p className="text-xs opacity-80">{result.ticket.buyer_name} · {result.ticket.quantity}×</p>
                  )}
                  {result.ticket?.ticket_type && (
                    <p className="text-xs opacity-70">{result.ticket.ticket_type}</p>
                  )}
                  {result.status === "already_redeemed" && result.ticket?.checked_in_at && (
                    <p className="text-xs opacity-70">
                      Eingecheckt: {new Date(result.ticket.checked_in_at).toLocaleTimeString("de-DE")}
                    </p>
                  )}
                  {result.status === "wrong_event" && (
                    <p className="text-xs opacity-80">Ticket gehört nicht zum ausgewählten Event</p>
                  )}
                  {(result.status === "invalid" || result.status === "cancelled") && (
                    <p className="text-sm opacity-80 font-mono bg-white/20 backdrop-blur-sm rounded px-2 py-1">
                      {result.message} {result.ticket?.id ? `· ID: ${result.ticket.id.slice(0, 8)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!cameraActive && !cameraError && (
              <button
                onClick={startCamera}
                className="absolute inset-0 text-muted-foreground text-sm text-center flex flex-col items-center justify-center gap-2 p-4"
                style={{ touchAction: "manipulation" }}
              >
                <Camera size={36} className="opacity-50" />
                <span>Tippen zum Starten</span>
              </button>
            )}
          </div>

          {processing && (
            <div className="mt-2 text-center text-sm text-muted-foreground animate-pulse">
              Wird geprüft...
            </div>
          )}
        </div>

        {/* Manual input */}
        <div className="glass-card p-3">
          <button
            onClick={() => {
              setShowManual(!showManual);
              if (!showManual) setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="flex items-center gap-2 w-full text-left font-display tracking-wider text-foreground text-sm min-h-[44px]"
            style={{ touchAction: "manipulation" }}
          >
            <Keyboard size={16} />
            MANUELL EINGEBEN
            <span className="text-muted-foreground text-xs ml-auto">{showManual ? "▲" : "▼"}</span>
          </button>

          {showManual && (
            <form onSubmit={handleManualSubmit} className="mt-2 flex gap-2">
              <Input
                ref={inputRef}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="QR-Code oder Ticket-Nr."
                className="bg-secondary border-border font-mono text-sm min-h-[44px]"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button
                type="submit"
                disabled={processing || !manualInput.trim()}
                className="font-display tracking-wider shrink-0 min-h-[44px] px-4"
                style={{ touchAction: "manipulation" }}
              >
                CHECK
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
});

ScannerPage.displayName = "ScannerPage";

export default ScannerPage;
