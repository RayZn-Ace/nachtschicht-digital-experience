import { afterEach, expect, it, vi } from "vitest";
import { fetchAllRows } from "./fetchAllRows";
afterEach(() => vi.useRealTimers());
it("returns all 9765 tickets across ten pages rather than truncating at 1000", async () => {
  const rows = Array.from({ length: 9765 }, (_, id) => ({ id }));
  const fetch = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
  expect(await fetchAllRows(fetch)).toEqual(rows);
  expect(fetch).toHaveBeenCalledTimes(10);
});
it("rejects a stalled later page instead of publishing earlier tickets as complete", async () => {
  vi.useFakeTimers();
  const pending = fetchAllRows((from) => from === 0 ? Promise.resolve({ data: Array(1000).fill({ id: 1 }), error: null }) : new Promise(() => {}));
  const assertion = expect(pending).rejects.toThrow("Read timed out");
  await vi.advanceTimersByTimeAsync(15000);
  await assertion;
});
it("discards a cancelled read and does not start the next page", async () => {
  const controller = new AbortController();
  const fetch = vi.fn(async () => { controller.abort(); return { data: Array(1000).fill({ id: 1 }), error: null }; });
  await expect(fetchAllRows(fetch, { signal: controller.signal })).rejects.toThrow("Read cancelled");
  expect(fetch).toHaveBeenCalledTimes(1);
});