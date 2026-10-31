export function ticketIdBounds(input: string): { lower: string; upper: string } | null {
  const compact = input.trim().replace(/^#/, "").replace(/-/g, "").toLowerCase();
  if (!/^[a-f0-9]{6,32}$/.test(compact)) return null;
  const uuid = (hex: string) => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { lower: uuid(compact.padEnd(32, "0")), upper: uuid(compact.padEnd(32, "f")) };
}

export function qrPrefix(input: string): string | null {
  const value = input.trim().replace(/^tkt-/i, "").toLowerCase();
  return /^[a-f0-9]{6,8}$/.test(value) || /^[a-f0-9]{8}-[a-f0-9-]{1,28}$/.test(value)
    ? `TKT-${value}%` : null;
}

export function canCheckIn(status: string): boolean {
  return status === "confirmed" || status === "paid";
}