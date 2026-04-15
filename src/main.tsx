import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isNativeApp } from "@/lib/capacitor";

// In native app: listen for deep link returns (e.g. after Mollie payment)
if (isNativeApp()) {
  import("@capacitor/app").then(({ App: CapApp }) => {
    CapApp.addListener("appUrlOpen", (event) => {
      // event.url = nachtschicht://payment-return/tickets/123?payment=success
      const url = new URL(event.url);
      const path = url.pathname + url.search; // e.g. /tickets/123?payment=success
      if (path) {
        window.location.href = path;
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
