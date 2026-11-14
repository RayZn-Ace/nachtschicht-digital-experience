// A capped/missing batch must never drive invoices, cancellations or emails.
export function hasCompleteTicketCoverage(ids: unknown[], rows: { id: string }[]): boolean {
  if (!ids.length || !ids.every(id => typeof id === "string")) return false;
  const expected = new Set(ids);
  const actual = new Set(rows.map(row => row.id));
  return expected.size === actual.size && [...expected].every(id => actual.has(String(id)));
}