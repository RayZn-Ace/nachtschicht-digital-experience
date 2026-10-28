
- Lounge availability (cards, floorplan, event page) goes through `useLoungeAvailability` + `src/lib/loungeAvailability.ts`; floorplan geometry maps stable lounge IDs in `src/lib/loungeFloorplans.ts` — one rule source, and unknown/error never renders as bookable.
- Floorplan backgrounds live in `public/images/floorplans/` (versioned names); hotspot geometry in `loungeFloorplans.ts` uses each image's native pixel space so the SVG overlay stays aligned at any width.
- Checkout discount lookup uses the exact-code `validate_discount_code` RPC returning only discount terms; never reopen public discount-table reads to repair checkout.
- Newsletter list sends paginate membership, fetch subscriber IDs in small chunks, claim campaigns atomically, and use idempotent provider batches with per-recipient history to avoid truncation, timeouts, and duplicate sends.
