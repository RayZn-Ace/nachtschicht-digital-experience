export type RefundState = "queued" | "pending" | "processing" | "refunded" | "failed" | "canceled" | "requested" | string;

export const FINAL_REFUND_STATES = ["refunded", "failed", "canceled"];

/** Plain-language label for a Mollie refund status. */
export function refundLabel(status: RefundState): { text: string; tone: "wait" | "ok" | "bad" } {
  switch (status) {
    case "requested": return { text: "Wird an Mollie gesendet", tone: "wait" };
    case "queued": return { text: "Bei Mollie angenommen – wartet", tone: "wait" };
    case "pending": return { text: "Bei Mollie angenommen – in Bearbeitung", tone: "wait" };
    case "processing": return { text: "Geld wird überwiesen", tone: "wait" };
    case "refunded": return { text: "Rausgegangen – an Kunden erstattet", tone: "ok" };
    case "failed": return { text: "Fehlgeschlagen", tone: "bad" };
    case "canceled": return { text: "Abgebrochen", tone: "bad" };
    default: return { text: `Status: ${status}`, tone: "wait" };
  }
}
