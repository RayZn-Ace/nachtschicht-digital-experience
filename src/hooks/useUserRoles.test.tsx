import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useUserRoles } from "./useUserRoles";

const state = vi.hoisted(() => ({ user: { id: "first" } as { id: string } | null, query: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: state.query }) }) } }));
afterEach(() => { vi.useRealTimers(); state.user = { id: "first" }; state.query.mockReset(); });

it("denies admin and scanner privileges after a stalled role lookup", async () => {
  vi.useFakeTimers();
  state.query.mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useUserRoles());
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(result.current.loading).toBe(false);
  expect(result.current.isAdmin).toBe(false);
  expect(result.current.isScanner).toBe(false);
});

it("never applies an old admin response to a different user", async () => {
  let resolveOld: ((value: { data: { role: string }[]; error: null }) => void) | undefined;
  state.query.mockImplementation(() => new Promise((resolve) => { resolveOld = resolve; }));
  const { result, rerender } = renderHook(() => useUserRoles());
  state.user = { id: "second" };
  state.query.mockResolvedValue({ data: [{ role: "user" }], error: null });
  rerender();
  await waitFor(() => expect(result.current.roles).toEqual(["user"]));
  await act(async () => { resolveOld?.({ data: [{ role: "admin" }], error: null }); });
  expect(result.current.isAdmin).toBe(false);
  expect(result.current.roles).toEqual(["user"]);
});

it("preserves a successful authorized admin role lookup", async () => {
  state.query.mockResolvedValue({ data: [{ role: "admin" }], error: null });
  const { result } = renderHook(() => useUserRoles());
  await waitFor(() => expect(result.current.isAdmin).toBe(true));
  expect(result.current.isScanner).toBe(true);
});