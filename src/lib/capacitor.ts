import { Capacitor } from "@capacitor/core";

/**
 * Check if the app is running inside a native Capacitor shell (iOS/Android).
 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Custom URL scheme for the app – must match capacitor.config.ts appId reversed.
 */
const APP_SCHEME = "nachtschicht";

/**
 * Build the correct redirect URL for Mollie payments.
 * - In native app: uses custom URL scheme so the OS re-opens the app after payment.
 * - In browser: uses the normal web origin.
 */
export const buildPaymentRedirectUrl = (path: string): string => {
  if (isNativeApp()) {
    // Custom URL scheme: nachtschicht://payment-return/tickets/123
    return `${APP_SCHEME}://payment-return${path}`;
  }
  return `${window.location.origin}${path}`;
};
