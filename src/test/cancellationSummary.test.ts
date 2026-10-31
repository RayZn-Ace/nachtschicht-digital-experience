import { describe, expect, it } from "vitest";
import { cancellationSummary } from "../../supabase/functions/cancel-ticket/summary";

describe("cancellation success response", () => {
  it("reports two cancelled individual tickets and two restored places", () => {
    const response = new Response(JSON.stringify({
      success: true,
      ...cancellationSummary([{ quantity: 1 }, { quantity: 1 }]),
      cancellation_invoice_id: null,
      cancellation_invoice_number: null,
      had_invoice: false,
    }));
    expect(response.status).toBe(200);
    return expect(response.json()).resolves.toMatchObject({
      success: true, cancelled_count: 2, restored_quantity: 2, had_invoice: false,
    });
  });
  it("counts legacy quantities instead of the number of rows", () => {
    expect(cancellationSummary([{ quantity: 3 }, { quantity: 2 }])).toEqual({
      cancelled_count: 2, restored_quantity: 5,
    });
  });
  it("retains invoice details in the successful response", () => {
    const result = JSON.parse(JSON.stringify({ success: true,
      ...cancellationSummary([{ quantity: 1 }]),
      cancellation_invoice_number: "TEST-2026-00001", had_invoice: true,
    }));
    expect(result).toEqual({ success: true, cancelled_count: 1, restored_quantity: 1,
      cancellation_invoice_number: "TEST-2026-00001", had_invoice: true });
  });
});