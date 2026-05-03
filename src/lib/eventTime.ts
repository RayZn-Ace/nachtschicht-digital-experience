/**
 * Event-Zeit-Helfer
 *
 * Alle Berechnungen interpretieren Event-Datum/Zeit explizit in deutscher Zeit
 * (Europe/Berlin), damit Server (UTC) und Client (lokal) zum selben Ergebnis
 * kommen. Ein Event gilt als vorbei, sobald sein Endzeitpunkt in deutscher
 * Zeit überschritten wurde.
 */

const BERLIN_TZ = "Europe/Berlin";

/** Aktueller Zeitstempel der "Wanduhr" in Berlin als Date. */
export function nowInBerlin(): Date {
  // Liefert die Zeit in Berlin als ISO-ähnlichen String und parst ihn als
  // lokale Zeit – damit Vergleiche unabhängig von der Server-Zeitzone stimmen.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  // Konstruieren als „naive" lokale Zeit – wird gleich gegen ebenfalls naive
  // Berliner Event-Zeiten verglichen.
  return new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")) === 24 ? 0 : Number(get("hour")),
    Number(get("minute")),
    Number(get("second"))
  );
}

interface EventLike {
  date: string | null;
  end_date?: string | null;
  time?: string | null;
  end_time?: string | null;
}

/** Effektiver Endzeitpunkt eines Events als „naive" Berliner Wanduhr-Zeit. */
export function getEventEndDateTime(e: EventLike): Date | null {
  if (!e?.date) return null;
  const startDate = String(e.date).split(/[T ]/)[0];
  let effectiveEndDate: string;

  let crossesMidnight = false;
  if (e.end_date) {
    effectiveEndDate = String(e.end_date).split(/[T ]/)[0];
    crossesMidnight = effectiveEndDate !== startDate;
  } else {
    const startTime = e.time || "22:00";
    const endTime = e.end_time || e.time || "23:59";
    if (endTime < startTime) {
      // Endzeit vor Startzeit -> Event geht über Mitternacht in den nächsten Tag
      const [y, m, d] = startDate.split("-").map(Number);
      const next = new Date(y, (m || 1) - 1, (d || 1) + 1);
      effectiveEndDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      crossesMidnight = true;
    } else {
      effectiveEndDate = startDate;
    }
  }

  // Wenn keine explizite Endzeit gesetzt ist:
  // - Bei Events über Mitternacht: 06:00 (typisches Club-Ende)
  // - Sonst: 23:59 (Tagesende)
  const endTime = e.end_time || (crossesMidnight ? "06:00" : "23:59");
  const [y, m, d] = effectiveEndDate.split("-").map(Number);
  const [hh, mm] = endTime.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
}

/** True, wenn der Event-Endzeitpunkt in deutscher Zeit überschritten ist. */
export function isEventPast(e: EventLike, now: Date = nowInBerlin()): boolean {
  const end = getEventEndDateTime(e);
  if (!end) return false;
  return end.getTime() < now.getTime();
}

/** Filterhilfe: behält nur Events, die noch nicht zu Ende sind. */
export function filterUpcomingEvents<T extends EventLike>(events: T[]): T[] {
  const now = nowInBerlin();
  return events.filter((e) => !isEventPast(e, now));
}
