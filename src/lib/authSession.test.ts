import { afterEach, expect, it, vi } from "vitest";
import { getSessionBounded } from "./authSession";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.read } } }));
afterEach(() => { vi.useRealTimers(); mocks.read.mockReset(); });
it("ends token lookup after 15 seconds without retry or a write", async () => {
  vi.useFakeTimers();
  mocks.read.mockReturnValue(new Promise(() => {}));
  const pending = getSessionBounded();
  const assertion = expect(pending).rejects.toThrow("Read timed out");
  await vi.advanceTimersByTimeAsync(15000);
  await assertion;
  expect(mocks.read).toHaveBeenCalledTimes(1);
});
it("preserves an available session and server error exactly", async () => {
  const response = { data: { session: null }, error: { message: "expired" } };
  mocks.read.mockResolvedValue(response);
  expect(await getSessionBounded()).toBe(response);
});