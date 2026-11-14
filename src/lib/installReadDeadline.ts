import { boundedReadFetch } from "./readDeadline";

// Imported before App: the data client's captured fetch must already be bounded.
const backendUrl = import.meta.env.VITE_SUPABASE_URL;
if (backendUrl) {
  window.fetch = boundedReadFetch(window.fetch.bind(window), new URL(backendUrl).origin);
}