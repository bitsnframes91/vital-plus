import type { CapacitorConfig } from "@capacitor/cli";

// iOS shell for the bundled SPA from `bun run build:mobile`. See docs/ios/README.md.
const config: CapacitorConfig = {
  // Placeholder until the App Store bundle ID is registered; override with CAPACITOR_APP_ID.
  // The Xcode project keeps its own PRODUCT_BUNDLE_IDENTIFIER (docs/ios/app-store-readiness.md).
  appId: process.env["CAPACITOR_APP_ID"] ?? "com.example.vitalplus",
  appName: "Vivo Health",
  webDir: "dist-mobile/client",
  // No `url`: the app ships its UI and never loads the website into the web view.
  // The scheme/hostname form the origin allowed by the server (NATIVE_APP_ORIGINS in src/start.ts).
  server: { iosScheme: "capacitor", hostname: "localhost" },
  ios: {
    // viewport-fit=cover plus env(safe-area-inset-*) in src/mobile/native.css handle the insets.
    contentInset: "never",
    backgroundColor: "#F6F8F9",
    preferredContentMode: "mobile",
  },
  plugins: {
    StatusBar: { overlaysWebView: true, style: "LIGHT" },
  },
};

export default config;
