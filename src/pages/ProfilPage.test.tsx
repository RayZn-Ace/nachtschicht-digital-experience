import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import ProfilPage from "./ProfilPage";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ lang: "de" }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
afterEach(cleanup);
it("redirects signed-out profiles before waiting for profile data", () => {
  render(<MemoryRouter initialEntries={["/profil"]}><Routes><Route path="/profil" element={<ProfilPage />} /><Route path="/login" element={<div>Login target</div>} /></Routes></MemoryRouter>);
  expect(screen.getByText("Login target")).toBeInTheDocument();
});