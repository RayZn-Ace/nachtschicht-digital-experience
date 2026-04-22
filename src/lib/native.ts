import { Capacitor } from "@capacitor/core";

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export const isIosNativeApp = (): boolean => isNativeApp() && Capacitor.getPlatform() === "ios";
