import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventOption {
  id: string;
  title: string;
  date: string;
}

interface EventSearchSelectProps {
  events: EventOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

const useOverlayPicker = () => {
  const [useOverlay, setUseOverlay] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const noHover = window.matchMedia("(hover: none)").matches;
      const narrowViewport = window.innerWidth < 1024;
      setUseOverlay(coarsePointer || noHover || narrowViewport);
    };

    updateMode();
    window.addEventListener("resize", updateMode);
    window.addEventListener("orientationchange", updateMode);

    return () => {
      window.removeEventListener("resize", updateMode);
      window.removeEventListener("orientationchange", updateMode);
    };
  }, []);

  return useOverlay;
};

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
  const useOverlay = useOverlayPicker();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || useOverlay) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, useOverlay]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }

    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open || !useOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, useOverlay]);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return events;

    return events.filter((ev) => {
      const dateLabel = new Date(ev.date).toLocaleDateString("de-DE");
      return normalize(ev.title).includes(q) || normalize(dateLabel).includes(q);
    });
  }, [events, query]);

  const selectedLabel = useMemo(() => {
    if (value === "all") return allLabel;
    const ev = events.find((e) => e.id === value);
    if (!ev) return allLabel;
    return `${ev.title} – ${new Date(ev.date).toLocaleDateString("de-DE")}`;
  }, [value, events, allLabel]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const listContent = (
    <>
      <div className="p-2 border-b border-border flex items-center gap-2">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground min-w-0"
          style={{ fontSize: "16px" }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground shrink-0 p-1"
            aria-label="Suche leeren"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={cn("overflow-y-auto py-1", useOverlay ? "flex-1" : "max-h-64")}>
        <button
          type="button"
          onClick={() => handleSelect("all")}
          className={cn(
            "w-full text-left px-3 py-3 text-sm flex items-center justify-between gap-2 active:bg-accent hover:bg-accent hover:text-accent-foreground min-h-[44px]",
            value === "all" && "bg-accent/50"
          )}
          style={{ touchAction: "manipulation" }}
        >
          <span>{allLabel}</span>
          {value === "all" && <Check size={16} className="text-primary shrink-0" />}
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
                onClick={() => handleSelect(ev.id)}
                className={cn(
                  "w-full text-left px-3 py-3 text-sm flex items-center justify-between gap-2 active:bg-accent hover:bg-accent hover:text-accent-foreground min-h-[44px]",
                  value === ev.id && "bg-accent/50"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <span className="truncate">
                  {ev.title} <span className="text-muted-foreground">– {dateLabel}</span>
                </span>
                {value === ev.id && <Check size={16} className="text-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </>
  );

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

      {open && !useOverlay && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {listContent}
        </div>
      )}

      {open && useOverlay && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          <div className="flex items-center justify-between px-3 py-3 border-b border-border bg-background">
            <span className="font-display tracking-wider text-sm text-foreground">EVENT WÄHLEN</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Schließen"
              style={{ touchAction: "manipulation" }}
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden bg-popover">
            {listContent}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
