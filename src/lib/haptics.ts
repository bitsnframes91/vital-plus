import { isNativeApp } from "@/lib/native-app";

// One subtle tap on the iPhone when a swipe action completes. Web builds never load the
// plugin (it would fall back to navigator.vibrate), and failures never block the action.
export function completionHaptic(): void {
  if (!isNativeApp) return;
  void import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
    .catch(() => {});
}
