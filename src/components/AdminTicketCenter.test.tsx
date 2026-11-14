import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AdminTicketCenter from "./AdminTicketCenter";
const mock = vi.hoisted(() => ({ fail: false, total: 9765 }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let from = 0, to = 999;
  const query = {
    select: () => query, order: () => query, range: (a: number, b: number) => { from = a; to = b; return query; },
    abortSignal: () => query,
    then: (resolve: (value: unknown) => void) => {
      if (mock.fail && table === "tickets" && from === 1000) return Promise.resolve({ data: null, error: new Error("failed") }).then(resolve);
      const data = table === "tickets" ? Array.from({ length: Math.max(0, Math.min(to + 1, mock.total) - from) }, (_, i) => ({ id: `ticket-${from+i}`, event_id: "event", ticket_type_id: "type", buyer_email: `synthetic-${from+i}@example.invalid`, buyer_name: `Guest ${from+i}`, created_at: "2026-11-14T20:00:00Z", status: "confirmed", quantity: 1, total_price: 10, checked_in: false })) : table === "events" ? [{ id: "event", title: "Synthetic event", date: "2026-11-14" }] : [{ id: "type", event_id: "event", name: "Standard", price: 10, sold: 0, quantity: 10000 }];
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  }; return query;
} } }));
afterEach(() => { cleanup(); mock.fail = false; });
it("keeps complete totals and searches the last ticket while rendering only one sales page", async () => {
  render(<AdminTicketCenter />);
  await screen.findByText("9765");
  fireEvent.click(screen.getByText("VERKÄUFE"));
  await waitFor(() => expect(document.querySelectorAll('[role="button"][tabindex="0"]').length).toBe(100));
  const input = screen.getByPlaceholderText(/Such/i);
  fireEvent.change(input, { target: { value: "synthetic-9764@" } });
  await screen.findByText(/Guest 9764/);
  expect(document.querySelectorAll('[role="button"][tabindex="0"]').length).toBe(1);
});
it("shows an error instead of incomplete statistics and can retry", async () => {
  mock.fail = true;
  render(<AdminTicketCenter />);
  await screen.findByText("Ticketcenter konnte nicht vollständig geladen werden.");
  expect(screen.queryByText("Gesamtumsatz")).toBeNull();
  mock.fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
  await screen.findByText("9765");
});