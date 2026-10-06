import { useEffect, useMemo, useState } from "react";
import { Check, X, Minus, HelpCircle, Shield, Users, Wine, RefreshCw, Loader2 } from "lucide-react";
import { FLOORPLANS, FLOOR_VIEWBOX, type RoomId } from "@/lib/loungeFloorplans";
import {
  resolveLoungeStatus, isBookable,
  type AvailabilityLoadState, type LoungeAvailabilityRow, type LoungeDisplayStatus,
} from "@/lib/loungeAvailability";

export interface FloorLounge {
  id: string;
  name: string;
  area_id: string;
  capacity: number;
  min_spend: number;
  price_per_person: number;
  image_url: string | null;
  description: string | null;
  price_note?: string | null;
}

interface Props {
  lang: "de" | "en" | string;
  eventId: string | null | undefined;
  /** Eligible (assigned/active/area-open), already price-overridden lounges for the event */
  lounges: FloorLounge[];
  loadState: AvailabilityLoadState;
  bookings: LoungeAvailabilityRow[];
  onRetry: () => void;
  onReserve: (lounge: FloorLounge) => void;
  translate?: (s: string) => string;
}

const STATUS_COLOR: Record<LoungeDisplayStatus, string> = {
  available: "hsl(var(--success))",
  non_binding: "hsl(var(--success))",
  booked: "hsl(var(--destructive))",
  unknown: "hsl(var(--status-unknown))",
  unavailable: "hsl(var(--status-unknown))",
};

const statusText = (s: LoungeDisplayStatus, de: boolean) =>
  ({
    available: de ? "Verfügbar" : "Available",
    non_binding: de ? "Verfügbar (vorgemerkt)" : "Available (pencilled in)",
    booked: de ? "Reserviert" : "Booked",
    unknown: de ? "Status unbekannt" : "Status unknown",
    unavailable: de ? "Nicht buchbar" : "Not bookable",
  })[s];

const StatusIcon = ({ s, size = 14 }: { s: LoungeDisplayStatus; size?: number }) =>
  s === "booked" ? <X size={size} /> : s === "unavailable" ? <Minus size={size} /> : s === "unknown" ? <HelpCircle size={size} /> : <Check size={size} />;

const glyph = (s: LoungeDisplayStatus) => (s === "booked" ? "✕" : s === "unavailable" ? "–" : s === "unknown" ? "?" : "✓");

const LoungeFloorplan = ({ lang, eventId, lounges, loadState, bookings, onRetry, onReserve, translate = (s) => s }: Props) => {
  const de = lang === "de";
  const byId = useMemo(() => new Map(lounges.map((l) => [l.id, l])), [lounges]);
  const firstRoom = (FLOORPLANS.find((r) => r.nodes.some((n) => byId.has(n.loungeId)))?.id ?? "agostea") as RoomId;
  const [room, setRoom] = useState<RoomId>(firstRoom);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Event change: reset selection + jump to first room with lounges
  useEffect(() => { setSelectedId(null); setRoom(firstRoom); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = FLOORPLANS.find((r) => r.id === room)!;
  const statusOf = (id: string) =>
    resolveLoungeStatus({ eligible: byId.has(id), loadState, bookings, loungeId: id, eventId });

  if (!eventId) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground text-sm">
        {de ? "Bitte zuerst ein Event wählen – erst dann zeigen wir, welche Lounges an diesem Abend frei sind." : "Please choose an event first – availability is shown per evening."}
      </div>
    );
  }

  const selected = selectedId ? byId.get(selectedId) : null;
  const selectedNode = plan.nodes.find((n) => n.loungeId === selectedId);
  const selStatus = selectedId ? statusOf(selectedId) : null;

  return (
    <div className="space-y-4">
      {/* Room tabs */}
      <div role="tablist" aria-label={de ? "Räume" : "Rooms"} className="grid grid-cols-3 gap-2">
        {FLOORPLANS.map((r) => {
          const free = r.nodes.filter((n) => isBookable(statusOf(n.loungeId))).length;
          const active = r.id === room;
          return (
            <button
              key={r.id} role="tab" aria-selected={active}
              onClick={() => { setRoom(r.id); setSelectedId(null); }}
              className={`min-h-11 px-2 py-2 rounded-md border font-display tracking-wider text-sm transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-foreground hover:border-primary/50"}`}
            >
              {r.name}
              <span className="block text-[10px] font-sans tracking-normal opacity-80">
                {loadState === "ready" ? `${free} ${de ? "frei" : "free"}` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Load state banners */}
      {loadState === "loading" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {de ? "Verfügbarkeit wird geladen…" : "Loading availability…"}</p>
      )}
      {loadState === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
          <span>{de ? "Verfügbarkeit konnte nicht geladen werden. Buchung vorübergehend deaktiviert." : "Availability could not be loaded. Booking temporarily disabled."}</span>
          <button onClick={onRetry} className="inline-flex min-h-9 items-center gap-1 rounded-md bg-primary px-3 text-primary-foreground font-medium">
            <RefreshCw size={12} /> {de ? "Erneut versuchen" : "Retry"}
          </button>
        </div>
      )}

      {/* Map */}
      <div className="glass-card p-2 sm:p-4">
        <svg viewBox={`0 0 ${FLOOR_VIEWBOX.w} ${FLOOR_VIEWBOX.h}`} className="w-full h-auto" role="group" aria-label={`${de ? "Raumplan" : "Floorplan"} ${plan.name}`}>
          <rect x="6" y="6" width={FLOOR_VIEWBOX.w - 12} height={FLOOR_VIEWBOX.h - 12} rx="14" fill="hsl(var(--muted) / 0.35)" stroke="hsl(var(--border))" strokeWidth="2" />
          {plan.landmarks.map((l, i) => (
            <g key={i} aria-hidden="true">
              <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={l.kind === "dance" ? 18 : 8}
                fill={l.kind === "dj" ? "hsl(var(--primary) / 0.25)" : "hsl(var(--secondary) / 0.6)"}
                stroke={l.kind === "dj" ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeDasharray={l.kind === "dance" ? "6 5" : undefined} strokeWidth="1.5" />
              <text x={l.x + l.w / 2} y={l.y + l.h / 2} textAnchor="middle" dominantBaseline="central"
                fill="hsl(var(--muted-foreground))" fontSize={l.kind === "bar" ? 13 : 15} letterSpacing="2"
                style={{ fontFamily: "var(--font-display)" }}
                transform={l.kind === "bar" ? `rotate(-90 ${l.x + l.w / 2} ${l.y + l.h / 2})` : undefined}>
                {l.label[de ? "de" : "en"]}
              </text>
            </g>
          ))}
          {plan.nodes.map((n) => {
            const s = statusOf(n.loungeId);
            const isSel = n.loungeId === selectedId;
            const lounge = byId.get(n.loungeId);
            const label = `${lounge ? translate(lounge.name) : n.name}: ${statusText(s, de)}`;
            return (
              <g
                key={n.loungeId} role="button" tabIndex={0} aria-label={label} aria-pressed={isSel}
                className="cursor-pointer outline-none [&:focus-visible>rect.ring]:opacity-100"
                onClick={() => setSelectedId(n.loungeId)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(n.loungeId); } }}
              >
                <title>{label}</title>
                <rect className="ring opacity-0" x={n.x - 5} y={n.y - 5} width={n.w + 10} height={n.h + 10} rx="12" fill="none" stroke="hsl(var(--ring))" strokeWidth="3" />
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="9"
                  fill={STATUS_COLOR[s]} fillOpacity={s === "unavailable" ? 0.18 : 0.3}
                  stroke={isSel ? "hsl(var(--foreground))" : STATUS_COLOR[s]} strokeWidth={isSel ? 3 : 2}
                  strokeDasharray={s === "unavailable" ? "4 4" : undefined} />
                <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 7} textAnchor="middle" dominantBaseline="central"
                  fill="hsl(var(--foreground))" fontSize="20" letterSpacing="1" style={{ fontFamily: "var(--font-display)" }}>{n.short}</text>
                <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 14} textAnchor="middle" dominantBaseline="central"
                  fill="hsl(var(--foreground))" fontSize="14" fontWeight="700">{glyph(s)}</text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">{de ? "Schematische Darstellung, nicht maßstabsgetreu" : "Schematic, not to scale"}</p>
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label={de ? "Legende" : "Legend"}>
        {(["available", "booked", "unavailable"] as LoungeDisplayStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded" style={{ background: STATUS_COLOR[s], color: "hsl(var(--background))" }}><StatusIcon s={s} size={12} /></span>
            {s === "unavailable" ? (de ? "Nicht buchbar / unbekannt" : "Not bookable / unknown") : statusText(s, de)}
          </li>
        ))}
      </ul>

      {/* Detail panel */}
      {selectedId && selStatus && (
        <div className="glass-card overflow-hidden" aria-live="polite">
          {selected?.image_url && (
            <div className="relative h-40 sm:h-52 overflow-hidden">
              <img src={selected.image_url} alt={translate(selected.name)} className={`h-full w-full object-cover ${selStatus === "booked" ? "grayscale" : ""}`} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            </div>
          )}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-widest text-muted-foreground">{plan.name}</p>
                <h3 className="font-display text-2xl tracking-wider text-foreground">{selected ? translate(selected.name) : selectedNode?.name}</h3>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: STATUS_COLOR[selStatus].slice(0, -1) + " / 0.18)", color: STATUS_COLOR[selStatus] }}>
                <StatusIcon s={selStatus} size={12} /> {statusText(selStatus, de)}
              </span>
            </div>
            {selected ? (
              <>
                {selected.description && <p className="text-sm text-muted-foreground line-clamp-3">{translate(selected.description)}</p>}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users size={14} className="text-primary" /> max. {selected.capacity}</span>
                  <span className="flex items-center gap-1"><Wine size={14} className="text-primary" /> {selected.min_spend}€ {de ? "Mindestverzehr" : "min. spend"}</span>
                  <span>{selected.price_per_person}€ {de ? "/ Person" : "/ person"}</span>
                  {selected.price_note && <span className="text-primary font-medium">{selected.price_note}</span>}
                </div>
                {selStatus === "non_binding" && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Shield size={12} /> {de ? "Unverbindlich vorgemerkt – garantierte Buchung noch möglich." : "Pencilled in – guaranteed booking still possible."}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{de ? "Diese Lounge ist an diesem Abend nicht buchbar." : "This lounge cannot be booked this evening."}</p>
            )}
            <button
              onClick={() => selected && isBookable(selStatus) && onReserve(selected)}
              disabled={!selected || !isBookable(selStatus)}
              className="w-full min-h-12 rounded-md bg-primary py-3 font-display text-lg tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selStatus === "booked" ? (de ? "BEREITS RESERVIERT" : "ALREADY BOOKED")
                : selStatus === "unknown" ? (de ? "STATUS UNBEKANNT" : "STATUS UNKNOWN")
                : selStatus === "unavailable" ? (de ? "NICHT BUCHBAR" : "NOT BOOKABLE")
                : (de ? "JETZT RESERVIEREN" : "BOOK NOW")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoungeFloorplan;
