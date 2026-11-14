import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import PagedItems from "./PagedItems";
afterEach(cleanup);
it("makes every ticket reachable without rendering thousands at once", () => {
  const items = Array.from({ length: 201 }, (_, id) => ({ id }));
  render(<PagedItems items={items}>{item => <p key={item.id}>Ticket {item.id}</p>}</PagedItems>);
  expect(screen.queryByText("Ticket 200")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
  fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
  expect(screen.getByText("Ticket 200")).toBeInTheDocument();
  expect(screen.queryByText("Ticket 0")).toBeNull();
});