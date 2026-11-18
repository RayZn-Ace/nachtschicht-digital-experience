import { describe, it, expect } from "vitest";
import { refundLabel, FINAL_REFUND_STATES } from "./refundStatus";
describe("refundLabel", () => {
  it("queued counts as accepted by Mollie", () => expect(refundLabel("queued").text).toContain("angenommen"));
  it("refunded means money went out", () => expect(refundLabel("refunded").tone).toBe("ok"));
  it("failed is bad and final", () => { expect(refundLabel("failed").tone).toBe("bad"); expect(FINAL_REFUND_STATES).toContain("failed"); });
  it("pending is not final", () => expect(FINAL_REFUND_STATES).not.toContain("pending"));
});
