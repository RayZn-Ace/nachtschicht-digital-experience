import { expect, it } from "vitest";
import { hasCompleteTicketCoverage } from "../../supabase/functions/_shared/ticketCoverage";
it("rejects a 1000-row truncated batch of 1001 requested tickets", () => {
  const ids = Array.from({ length: 1001 }, (_, id) => String(id));
  expect(hasCompleteTicketCoverage(ids, ids.slice(0, 1000).map(id => ({ id })))).toBe(false);
});
it("accepts exact coverage regardless of order and duplicate requested IDs", () => {
  expect(hasCompleteTicketCoverage(["a", "b", "a"], [{ id: "b" }, { id: "a" }])).toBe(true);
});
it("rejects a substituted or absent ticket", () => {
  expect(hasCompleteTicketCoverage(["a", "b"], [{ id: "a" }, { id: "c" }])).toBe(false);
});