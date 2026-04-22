import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativeOAuthRedirectUri } from "@/lib/native";

const OAUTH_STATE_KEY = "native-oauth-state";

const buildOAuthUrl = (provider: "google" | "apple", state: string, extraParams?: Record<string, string>) => {
  const params = new URLSearchParams({
    provider,
    redirect_uri: nativeOAuthRedirectUri,
    state,
    ...(extraParams ?? {}),
  });

  return `${window.location.origin}/~oauth/initiate?${params.toString()}`;
};

const generateState = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const startNativeOAuth = async (provider: "google" | "apple", extraParams?: Record<string, string>) => {
  if (!isNativeApp()) {
    throw new Error("Native OAuth is only available inside the app.");
  }

  const state = generateState();
  localStorage.setItem(OAUTH_STATE_KEY, state);
  await Browser.open({
    url: buildOAuthUrl(provider, state, extraParams),
    presentationStyle: "fullscreen",
  });
};

export const completeNativeOAuth = async (callbackUrl: string) => {
  const url = new URL(callbackUrl);
  const expectedState = localStorage.getItem(OAUTH_STATE_KEY);
  const state = url.searchParams.get("state");
  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  localStorage.removeItem(OAUTH_STATE_KEY);

  await Browser.close().catch(() => undefined);

  if (error) {
    throw new Error(error);
  }

  if (!expectedState || !state || expectedState !== state) {
    throw new Error("OAuth state mismatch.");
  }

  if (!accessToken || !refreshToken) {
    throw new Error("No OAuth tokens received.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw sessionError;
  }
};
