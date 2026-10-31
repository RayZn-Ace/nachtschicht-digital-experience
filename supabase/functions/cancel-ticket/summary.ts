// Reporting only: the database trigger remains responsible for sold counts.
export function cancellationSummary(tickets: ReadonlyArray<{ quantity: number }>) {
  return {
    cancelled_count: tickets.length,
    restored_quantity: tickets.reduce((total, ticket) => total + ticket.quantity, 0),
  };
}