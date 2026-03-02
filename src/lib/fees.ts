/**
 * Ticket fee calculation utilities.
 *
 * Events can define a default fee (per_ticket or per_order, fixed or percent).
 * Each ticket_type can optionally override the fee mode/amount.
 */

export interface FeeConfig {
  fee_enabled: boolean;
  fee_type: "per_ticket" | "per_order";
  fee_mode: "fixed" | "percent";
  fee_amount: number;
}

export interface TicketTypeFeeOverride {
  fee_override_enabled: boolean;
  fee_mode_override: string | null;
  fee_amount_override: number | null;
}

/**
 * Calculate the fee for a single ticket type.
 * If the ticket type has a fee override, it uses that instead of the event default.
 */
export function calcTicketFee(
  eventFee: FeeConfig,
  ticketPrice: number,
  quantity: number,
  typeOverride?: TicketTypeFeeOverride | null
): number {
  if (!eventFee.fee_enabled) return 0;

  let mode = eventFee.fee_mode;
  let amount = eventFee.fee_amount;

  if (typeOverride?.fee_override_enabled && typeOverride.fee_mode_override && typeOverride.fee_amount_override != null) {
    mode = typeOverride.fee_mode_override as "fixed" | "percent";
    amount = typeOverride.fee_amount_override;
  }

  if (mode === "percent") {
    const feePerTicket = ticketPrice * (amount / 100);
    return eventFee.fee_type === "per_ticket"
      ? +(feePerTicket * quantity).toFixed(2)
      : +feePerTicket.toFixed(2); // per_order: percent of single ticket price
  }

  // fixed
  return eventFee.fee_type === "per_ticket"
    ? +(amount * quantity).toFixed(2)
    : +amount.toFixed(2);
}

/**
 * Calculate total fees for an entire order (multiple ticket types).
 */
export function calcOrderFees(
  eventFee: FeeConfig,
  items: Array<{ price: number; quantity: number; override?: TicketTypeFeeOverride | null }>
): number {
  if (!eventFee.fee_enabled) return 0;

  if (eventFee.fee_type === "per_order") {
    // For per_order with fixed: one flat fee regardless of items
    if (eventFee.fee_mode === "fixed") {
      // Check if any item overrides – use highest override, else event default
      return +eventFee.fee_amount.toFixed(2);
    }
    // For per_order with percent: percent of total ticket value
    const totalTicketValue = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return +(totalTicketValue * (eventFee.fee_amount / 100)).toFixed(2);
  }

  // per_ticket: sum fees for each item
  return items.reduce((sum, item) => {
    return sum + calcTicketFee(eventFee, item.price, item.quantity, item.override);
  }, 0);
}

/**
 * Format fee for display (e.g., "2,00 €" or "5%")
 */
export function formatFeeConfig(mode: string, amount: number): string {
  if (mode === "percent") return `${amount}%`;
  return `${amount.toFixed(2).replace(".", ",")} €`;
}
