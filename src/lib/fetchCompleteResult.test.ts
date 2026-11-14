import { expect, it } from "vitest";
import { fetchCompleteResult } from "./fetchCompleteResult";
it("never returns accumulated tickets when a later page fails", async () => {
  const result = await fetchCompleteResult(async from => from === 0 ? { data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null } : { data: null, error: new Error("failed") });
  expect(result.data).toBeNull();
  expect(result.error).toBeInstanceOf(Error);
});
it("returns all pages rather than the first 1000", async () => {
  const result = await fetchCompleteResult(async from => ({ data: Array.from({ length: from === 0 ? 1000 : 15 }, (_, id) => ({ id: from + id })), error: null }));
  expect(result.data?.length).toBe(1015);
  expect(result.data?.at(-1)?.id).toBe(1014);
});