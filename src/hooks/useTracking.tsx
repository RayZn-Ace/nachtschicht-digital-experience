import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initTracking, trackPageView, grantConsent } from "@/lib/tracking";

let _initialized = false;

/**
 * Hook to initialize tracking and fire PageView on route changes.
 * Call once in Layout or App.
 */
export const useTracking = (options?: { disabled?: boolean }) => {
  const location = useLocation();
  const disabled = options?.disabled ?? false;

  useEffect(() => {
    if (disabled) return;
    if (!_initialized) {
      initTracking();
      _initialized = true;
    }
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    trackPageView();
  }, [disabled, location.pathname]);
};

export { grantConsent };
