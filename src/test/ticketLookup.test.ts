import { describe, expect, it } from "vitest";
import { ticketIdBounds, qrPrefix, canCheckIn } from "../../supabase/functions/check-in-ticket/lookup";
import { fetchAllRows } from "../lib/fetchAllRows";

describe("scanner ticket lookup", () => {
  for (const [short, full] of [
    ["C9E4AB2F", "c9e4ab2f-d49c-4432-a2e8-e663db7a86b5"],
    ["6FF3D9BC", "6ff3d9bc-51bf-43ec-af3c-eb4720b93eee"],
    ["17B8ABA4", "17b8aba4-c286-4e9e-aa29-83702c50fe2c"],
    ["326CFE9E", "326cfe9e-9b94-464b-9a03-d2dcb8d8a055"],
  ]) {
    it(`resolves displayed number ${short} with UUID bounds`, () => {
      const bounds = ticketIdBounds(short);
      expect(bounds).toEqual({ lower: `${short.toLowerCase()}-0000-0000-0000-000000000000`, upper: `${short.toLowerCase()}-ffff-ffff-ffff-ffffffffffff` });
      expect(full >= (bounds?.lower || "z") && full <= (bounds?.upper || "")).toBe(true);
    });
  }
  it("keeps full UUID exact and allows display hash", () => {
    const id = "c9e4ab2f-d49c-4432-a2e8-e663db7a86b5";
    expect(ticketIdBounds(id)).toEqual({ lower: id, upper: id });
    expect(ticketIdBounds(" #C9E4AB2F ")).toEqual(ticketIdBounds("C9E4AB2F"));
  });
  it("rejects arbitrary strings and wildcard lookups", () => {
    for (const input of ["garbage", "%", "12", "C9E4AB2F%", "TKT-C9E4AB2F"]) expect(ticketIdBounds(input)).toBeNull();
    expect(qrPrefix("TKT-C9E4AB2F")).toBe("TKT-c9e4ab2f%");
    expect(qrPrefix("%" )).toBeNull();
  });
  it("only permits paid or confirmed tickets", () => {
    expect(canCheckIn("confirmed")).toBe(true);
    expect(canCheckIn("paid")).toBe(true);
    for (const status of ["pending", "cancelled", "canceled", "refunded", "failed"]) expect(canCheckIn(status)).toBe(false);
  });
});

describe("complete ticketcenter loading", () => {
  it("finds older tickets beyond the first 1000 records", async () => {
    const records = Array.from({ length: 2105 }, (_, id) => ({ id }));
    const pages: number[] = [];
    const result = await fetchAllRows(async (from, to) => {
      pages.push(from);
      return { data: records.slice(from, to + 1), error: null };
    });
    expect(pages).toEqual([0, 1000, 2000]);
    expect(result).toHaveLength(2105);
    expect(result.find(r => r.id === 2104)).toEqual({ id: 2104 });
  });
  it("does not return a partial list if a later page fails", async () => {
    await expect(fetchAllRows(async (from) => from === 0
      ? { data: Array.from({ length: 1000 }, (_, id) => id), error: null }
      : { data: null, error: new Error("denied") })).rejects.toThrow("denied");
  });
});