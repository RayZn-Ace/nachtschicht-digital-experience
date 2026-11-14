import { fetchAllRows } from "./fetchAllRows";
import { READ_FAILURE_EVENT } from "./readDeadline";

// Keeps existing response-style consumers fail-closed; never returns partial pages.
export async function fetchCompleteResult<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  try { return { data: await fetchAllRows(page), error: null }; }
  catch (error) {
    window.dispatchEvent(new Event(READ_FAILURE_EVENT));
    return { data: null, error };
  }
}