import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventOption {
  id: string;
  title: string;
  date: string;
}

interface EventSearchSelectProps {
  events: EventOption[];
  value: string; // event id or "all"
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

/**
 * Searchable event picker.
 * - Click to open dropdown with search input
 * - Filters by title (case-insensitive, accent-insensitive) and formatted date
 * - Min 44px touch target
 */
export const EventSearchSelect = ({
  events,
  value,
  onChange,
  placeholder = "Event suchen…",
  allLabel = "Alle Events",
  className,
}: EventSearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return events;
    return events.filter((ev) => {
      const dateLabel = new Date(ev.date).toLocaleDateString("de-DE");
      return (
        normalize(ev.title).includes(q) ||
        dateLabel.includes(q)
      );
    });
  }, [events, query]);

  const selectedLabel = useMemo(() => {
    if (value === "all") return allLabel;
    const ev = events.find((e) => e.id === value);
    if (!ev) return allLabel;
    return `${ev.title} – ${new Date(ev.date).toLocaleDateString("de-DE")}`;
  }, [value, events, allLabel]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm min-h-[44px] flex items-center justify-between gap-2 text-left"
        style={{ touchAction: "manipulation" }}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronsUpDown size={16} className="shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Suche leeren"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange("all"); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground min-h-[40px]",
                value === "all" && "bg-accent/50"
              )}
            >
              <span>{allLabel}</span>
              {value === "all" && <Check size={14} className="text-primary shrink-0" />}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Keine Events gefunden
              </div>
            ) : (
              filtered.map((ev) => {
                const dateLabel = new Date(ev.date).toLocaleDateString("de-DE");
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => { onChange(ev.id); setOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground min-h-[40px]",
                      value === ev.id && "bg-accent/50"
                    )}
                  >
                    <span className="truncate">
                      {ev.title} <span className="text-muted-foreground">– {dateLabel}</span>
                    </span>
                    {value === ev.id && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
