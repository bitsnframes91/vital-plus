import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// iPad support: native config, the app shell layout in the iOS app (no desktop phone frame),
// content widths, dialogs, and the Datenarten list without heart rate. Real rendering at iPad sizes
// (overflow, orientation) is checked by scripts/ios-layout-check.mjs in headless Chrome.
const root = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const flags = vi.hoisted(() => ({ native: true, path: "/heute" }));
vi.mock("@/lib/native-app", () => ({
  get isNativeApp() {
    return flags.native;
  },
  NATIVE_WEB_ORIGIN: "https://vital-plus.lovable.app",
  publicAppUrl: (p: string) => p,
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useLocation: (opts?: { select?: (s: { pathname: string }) => unknown }) =>
    opts?.select ? opts.select({ pathname: flags.path }) : { pathname: flags.path },
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
const user = {
  id: "u1",
  email: "a@b.c",
  email_confirmed_at: "2026-01-01",
  app_metadata: {},
  user_metadata: {},
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user } } }),
      getUser: async () => ({ data: { user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// Consent gating has its own tests; the layout is checked with consent given.
vi.mock("@/components/ConsentGate", () => ({ ConsentGate: ({ children }: { children: ReactNode }) => <>{children}</> }));

const { AppShell } = await import("@/components/AppShell");
afterEach(() => {
  cleanup();
  flags.native = true;
  flags.path = "/heute";
});

describe("native iPad configuration", () => {
  it("builds for iPhone and iPad, with all iPad orientations and portrait-only iPhone", () => {
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(pbx.match(/TARGETED_DEVICE_FAMILY = "1,2";/g)).toHaveLength(2);
    expect(pbx).not.toMatch(/TARGETED_DEVICE_FAMILY = 1;/);
    const plist = read("ios/App/App/Info.plist");
    const iphone =
      plist.match(
        /<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/,
      )?.[1] ?? "";
    const ipad =
      plist.match(
        /<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>([\s\S]*?)<\/array>/,
      )?.[1] ?? "";
    expect(iphone.match(/<string>/g)).toHaveLength(1);
    expect(iphone).toContain("UIInterfaceOrientationPortrait");
    for (const o of ["Portrait", "PortraitUpsideDown", "LandscapeLeft", "LandscapeRight"])
      expect(ipad).toContain(`<string>UIInterfaceOrientation${o}</string>`);
    expect(plist).not.toContain("UIRequiresFullScreen");
  });
});

describe("app shell in the iOS app", () => {
  const classes = () =>
    [...document.querySelectorAll("[class]")].map((e) => e.getAttribute("class")).join(" ");

  it("uses the full screen with a full-width tab bar, without the desktop phone frame", async () => {
    render(<AppShell>content</AppShell>);
    const nav = await screen.findByRole("navigation");
    expect(nav.className).toContain("inset-x-0");
    expect(nav.className).not.toMatch(/max-w-\[440px\]|sm:absolute/);
    expect(classes()).not.toMatch(/rounded-\[28px\]|max-w-\[440px\]|h-dvh|overflow-y-auto/);
    const content = screen.getByText("content").closest("div");
    expect(content?.className).toBe("w-full");
    expect(content).toHaveAttribute("data-native-width", "wide");
    expect(nav.querySelectorAll("a")).toHaveLength(6);
  });

  it("marks forms and lists for the readable column, still spanning the window", async () => {
    flags.path = "/login";
    render(<AppShell width="narrow">form</AppShell>);
    await waitFor(() => expect(screen.getByText("form")).toBeInTheDocument());
    const content = screen.getByText("form").closest("div");
    expect(content?.className).toBe("w-full");
    expect(content).toHaveAttribute("data-native-width", "narrow");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("keeps the web layout unchanged", async () => {
    flags.native = false;
    render(<AppShell>content</AppShell>);
    const nav = await screen.findByRole("navigation");
    expect(nav.className).toContain("max-w-[440px]");
    expect(classes()).toContain("sm:rounded-[28px]");
    const content = screen.getByText("content").closest("div");
    expect(content?.className).toBe("md:mx-auto md:w-full md:max-w-[1040px]");
    expect(content).not.toHaveAttribute("data-native-width");
  });

  it("uses the narrow width on form and list pages and the wide one on dashboards", () => {
    for (const page of [
      "login",
      "reset-password",
      "bestaetigt",
      "labor",
      "profil",
      "profil.$section",
      "profil.feedback",
    ])
      expect(read(`src/routes/${page}.tsx`), page).toContain('<AppShell width="narrow">');
    for (const page of ["heute", "ernaehrung", "gesundheit", "trends", "plan"])
      expect(read(`src/routes/${page}.tsx`), page).not.toContain('width="narrow"');
  });

  it("shows onboarding across the window without the phone frame in the app", () => {
    const onboarding = read("src/routes/onboarding.tsx");
    expect(onboarding).toContain('data-native-width={isNativeApp ? "narrow" : undefined}');
    expect(onboarding).toContain('isNativeApp ? "flex min-h-screen w-full flex-col bg-background"');
  });

  it("lets header bands span the window while narrow content keeps a centred column", () => {
    const css = read("src/mobile/native.css").replace(/\s+/g, " ");
    // Nothing changes on iPhone: the column and artwork rules start at tablet width.
    expect(css).toContain(
      '@media (min-width: 640px) { html[data-native-app] [data-native-width="narrow"] { --native-gutter: max(0px, calc((100vw - 720px) / 2)); padding-inline: var(--native-gutter); }',
    );
    expect(css).toContain(
      'html[data-native-app] [data-native-width="narrow"] > :is(header, .bg-header) { margin-inline: calc(-1 * var(--native-gutter)); border-inline: var(--native-gutter) solid transparent; }',
    );
    // The start artwork's off-white ground no longer shows as a pale panel on iPad.
    expect(css).toContain(
      "@media (min-width: 600px) { html[data-native-app] .home-produce { filter: brightness(1.02); } }",
    );
  });

  it("keeps dialogs inside the screen and scrollable", () => {
    document.documentElement.setAttribute("data-native-app", "");
    const style = document.createElement("style");
    style.textContent = read("src/mobile/native.css");
    document.head.append(style);
    document.body.innerHTML =
      '<div role="dialog" id="d"></div><div role="alertdialog" id="a"></div>';
    for (const id of ["d", "a"])
      expect(getComputedStyle(document.getElementById(id)!).overflowY).toBe("auto");
    expect(read("src/mobile/native.css")).toMatch(
      /\[role="dialog"\][\s\S]*?max-height: calc\(100dvh/,
    );
    document.documentElement.removeAttribute("data-native-app");
    style.remove();
    document.body.innerHTML = "";
  });
});

describe("Datenarten without heart rate", () => {
  it("does not list heart rate, which is still read and used by Trends", async () => {
    const { HEALTH_METRICS, metricStates } = await import("@/lib/apple-health/metrics");
    const { READ_TYPES } = await import("@/lib/apple-health/bridge");
    expect(HEALTH_METRICS.map((m) => m.type)).not.toContain("heartRate");
    expect(HEALTH_METRICS.map((m) => m.label)).not.toContain("Herzfrequenz");
    expect(READ_TYPES).toContain("heartRate");
    const states = metricStates({
      days: { "2026-10-28": { heartRate: { avg: 61 } } },
      startDay: "2026-10-28",
      endDay: "2026-10-28",
      failedTypes: [],
    });
    expect(states.some((s) => s.type === "heartRate")).toBe(false);
    expect(read("src/routes/trends.tsx")).toContain('field: "heartRate"');
    expect(read("ios/App/App/VitalHealthPlugin.swift")).toContain('"heartRate": .heartRate');
  });
});
