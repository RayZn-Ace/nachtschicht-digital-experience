import { describe, expect, it } from "vitest";
import { ticketDiscount, type ValidatedDiscount } from "@/lib/discounts";

const discount: ValidatedDiscount = { id: "test", code: "SYNTHETIC", discount_type: "percent", discount_value: 20 };

describe("checkout discount amounts", () => {
  it("applies percentage discounts to ticket subtotal, leaving fees unchanged", () => {
    const fees = 3;
    expect(50 - ticketDiscount(50, discount) + fees).toBe(43);
  });
  it("applies fixed discounts", () => {
    expect(ticketDiscount(50, { ...discount, discount_type: "fixed", discount_value: 15 })).toBe(15);
  });
  it("caps fixed discounts at ticket subtotal", () => {
    expect(ticketDiscount(10, { ...discount, discount_type: "fixed", discount_value: 15 })).toBe(10);
  });
  it("does not discount rejected or absent codes", () => {
    expect(ticketDiscount(50, null)).toBe(0);
  });
});