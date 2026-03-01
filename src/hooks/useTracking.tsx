import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initTracking, trackPageView, grantConsent } from "@/lib/tracking";

let _initialized = false;

/**
 * Hook to initialize tracking and fire PageView on route changes.
 * Call once in Layout or App.
 */
export const useTracking = () => {
  const location = useLocation();

  useEffect(() => {
    if (!_initialized) {
      initTracking();
      _initialized = true;
    }
  }, []);

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
};

export { grantConsent };
