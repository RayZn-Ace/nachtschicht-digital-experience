import { withDeadline } from "./readDeadline";

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  options: { signal?: AbortSignal; onProgress?: (loaded: number) => void } = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    if (options.signal?.aborted) throw new Error("Read cancelled");
    const { data, error } = await withDeadline(fetchPage(from, from + 999));
    if (options.signal?.aborted) throw new Error("Read cancelled");
    if (error) throw error;
    if (!data) throw new Error("Missing page data");
    rows.push(...data);
    options.onProgress?.(rows.length);
    if (data.length < 1000) return rows;
  }
}