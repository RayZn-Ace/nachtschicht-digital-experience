import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "./useAuth";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), signIn: vi.fn(), roles: vi.fn(), callback: undefined as undefined | ((event: string, session: unknown) => void) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: mocks.getSession, signInWithPassword: mocks.signIn, onAuthStateChange: (cb: typeof mocks.callback) => { mocks.callback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; } },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.roles }) }) }) }),
} }));
const session = (id = "first") => ({ user: { id } }) as Session;
afterEach(() => { cleanup(); vi.useRealTimers(); mocks.getSession.mockReset(); mocks.roles.mockReset(); mocks.signIn.mockReset(); });

it("does not repeat role lookup or loading on same-user refresh/focus", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: session() }, error: null });
  mocks.roles.mockResolvedValue({ data: { role: "admin" }, error: null });
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.isAdmin).toBe(true));
  await act(async () => { mocks.callback?.("TOKEN_REFRESHED", session()); await new Promise(r => setTimeout(r, 5)); });
  expect(mocks.roles).toHaveBeenCalledTimes(1);
  expect(result.current.loading).toBe(false);
  expect(result.current.isAdmin).toBe(true);
});

it("finishes stalled getSession fail-closed after 15 seconds", async () => {
  vi.useFakeTimers();
  mocks.getSession.mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(result.current.loading).toBe(false);
  expect(result.current.authError).toBe(true);
  expect(result.current.isAdmin).toBe(false);
});

it("does not let a late initial session overwrite an auth event", async () => {
  let resolve: ((v: unknown) => void) | undefined;
  mocks.getSession.mockReturnValue(new Promise(r => { resolve = r; }));
  mocks.roles.mockResolvedValue({ data: null, error: null });
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await act(async () => { mocks.callback?.("SIGNED_IN", session("second")); await new Promise(r => setTimeout(r, 5)); });
  await act(async () => { resolve?.({ data: { session: session("first") }, error: null }); });
  expect(result.current.user?.id).toBe("second");
});

it("returns a safe login error after stalled sign-in without retry", async () => {
  vi.useFakeTimers();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signIn.mockReturnValue(new Promise(() => {}));
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  const pending = result.current.signIn("synthetic@example.invalid", "synthetic-only");
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect((await pending).error?.message).toContain("Anmeldung dauert zu lange");
  expect(mocks.signIn).toHaveBeenCalledTimes(1);
});

it("role lookup failure prevents routing as an ordinary customer", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: session() }, error: null });
  mocks.roles.mockResolvedValue({ data: null, error: new Error("unavailable") });
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.authError).toBe(true));
  expect(result.current.loading).toBe(false);
  expect(result.current.isAdmin).toBe(false);
});