export interface ValidatedDiscount {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
}

export function ticketDiscount(subtotal: number, discount: ValidatedDiscount | null): number {
  if (!discount) return 0;
  return Math.min(subtotal, Math.max(0, discount.discount_type === "percent"
    ? subtotal * discount.discount_value / 100
    : discount.discount_value));
}