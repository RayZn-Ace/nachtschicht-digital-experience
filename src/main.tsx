import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isNativeApp } from "@/lib/capacitor";
import { completeNativeOAuth } from "@/lib/nativeOAuth";

// In native app: listen for deep link returns (e.g. after Mollie payment)
if (isNativeApp()) {
  import("@capacitor/app").then(({ App: CapApp }) => {
    CapApp.addListener("appUrlOpen", async (event) => {
      const url = new URL(event.url);

      if (url.protocol === "nachtschicht:" && url.hostname === "oauth-callback") {
        try {
          await completeNativeOAuth(event.url);
          window.location.href = "/dashboard";
        } catch (error) {
          const message = error instanceof Error ? error.message : "OAuth failed";
          window.location.href = `/login?oauth_error=${encodeURIComponent(message)}`;
        }
        return;
      }

      const path = url.pathname + url.search;
      if (path) {
        window.location.href = path;
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
