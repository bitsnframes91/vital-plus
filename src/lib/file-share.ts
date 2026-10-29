import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "./native-app";

// Hands a generated text file to the user. WKWebView ignores <a download> on Blob URLs, so the iOS app
// shows the native share sheet (Save to Files, AirDrop, Mail …) via FileSharePlugin.swift instead.

type FileShare = {
  shareFile(options: { filename: string; content: string }): Promise<{ completed: boolean }>;
};
let native: FileShare | undefined;

/** "shared": the share sheet finished an action; "cancelled": closed without one; "downloaded": the browser download was started. */
export type FileResult = "shared" | "cancelled" | "downloaded";

export async function saveTextFile({
  filename,
  content,
  type = "application/json",
}: {
  filename: string;
  content: string;
  type?: string;
}): Promise<FileResult> {
  if (isNativeApp) {
    const { completed } = await (native ??= registerPlugin<FileShare>("FileShare")).shareFile({
      filename,
      content,
    });
    return completed ? "shared" : "cancelled";
  }
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Revoking right away can abort the download in Safari and Firefox.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return "downloaded";
}
