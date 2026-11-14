import { afterEach, describe, expect, it, vi } from "vitest";
import { boundedReadFetch, isBoundedRead, READ_TIMEOUT_MS, withDeadline } from "./readDeadline";

const origin = "https://backend.example";
afterEach(() => vi.useRealTimers());
describe("bounded read requests", () => {
  it("limits a stalled read to 15000 ms", async () => {
    vi.useFakeTimers();
    expect(READ_TIMEOUT_MS).toBe(15000);
    const pending = withDeadline(new Promise(() => {}));
    const assertion = expect(pending).rejects.toThrow("Read timed out");
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });
  it("never bounds financial writes, emails, or another origin", () => {
    expect(isBoundedRead(`${origin}/functions/v1/create-mollie-payment`, { method: "POST" }, origin)).toBe(false);
    expect(isBoundedRead(`${origin}/functions/v1/send-booking-email`, { method: "POST" }, origin)).toBe(false);
    expect(isBoundedRead(`${origin}/rest/v1/tickets`, { method: "POST" }, origin)).toBe(false);
    expect(isBoundedRead("https://other.example/rest/v1/events", {}, origin)).toBe(false);
  });
  it("includes safe availability and exact-code RPC but not unknown RPCs", () => {
    expect(isBoundedRead(`${origin}/rest/v1/rpc/get_lounge_availability`, { method: "POST" }, origin)).toBe(true);
    expect(isBoundedRead(`${origin}/rest/v1/rpc/validate_discount_code`, { method: "POST" }, origin)).toBe(true);
    expect(isBoundedRead(`${origin}/rest/v1/rpc/unknown`, { method: "POST" }, origin)).toBe(false);
  });
  it("returns a timeout error, aborts once and never retries", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })) as unknown as typeof fetch;
    const pending = boundedReadFetch(fetcher, origin)(`${origin}/rest/v1/events`);
    await vi.advanceTimersByTimeAsync(15000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect((await response.json()).code).toBe("READ_TIMEOUT");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("preserves successful read data and headers", async () => {
    const wrapped = boundedReadFetch(vi.fn().mockResolvedValue(new Response('[{"id":"event"}]', { headers: { "Content-Type": "application/json", "Content-Range": "0-0/1" } })), origin);
    const response = await wrapped(`${origin}/rest/v1/events`);
    expect(await response.json()).toEqual([{ id: "event" }]);
    expect(response.headers.get("Content-Range")).toBe("0-0/1");
  });
});