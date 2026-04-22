import { isIosNativeApp } from "@/lib/native";

export type NativeTrackingStatus = "authorized" | "denied" | "notDetermined" | "restricted" | "unsupported";

export const getNativeTrackingStatus = async (): Promise<NativeTrackingStatus> => {
  if (!isIosNativeApp()) return "unsupported";

  const { AppTrackingTransparency } = await import("capacitor-plugin-app-tracking-transparency");
  const { status } = await AppTrackingTransparency.getStatus();
  return status;
};

export const requestNativeTrackingPermission = async (): Promise<NativeTrackingStatus> => {
  if (!isIosNativeApp()) return "unsupported";

  const { AppTrackingTransparency } = await import("capacitor-plugin-app-tracking-transparency");
  const { status } = await AppTrackingTransparency.requestPermission();
  return status;
};
