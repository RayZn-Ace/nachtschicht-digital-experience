
- Lounge availability (cards, floorplan, event page) goes through `useLoungeAvailability` + `src/lib/loungeAvailability.ts`; floorplan geometry maps stable lounge IDs in `src/lib/loungeFloorplans.ts` — one rule source, and unknown/error never renders as bookable.
