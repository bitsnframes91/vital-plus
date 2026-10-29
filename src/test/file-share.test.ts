import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Saving generated files: browsers download them; the iOS app, where WKWebView ignores <a download>
// on Blob URLs, hands them to the native share sheet (FileSharePlugin.swift).
const m = vi.hoisted(() => ({ native: false, shareFile: vi.fn(), registered: [] as string[] }));
vi.mock("@/lib/native-app", () => ({
  get isNativeApp() {
    return m.native;
  },
}));
vi.mock("@capacitor/core", () => ({
  registerPlugin: (name: string) => {
    m.registered.push(name);
    return { shareFile: m.shareFile };
  },
}));

const { saveTextFile } = await import("@/lib/file-share");
const root = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

beforeEach(() => {
  m.native = false;
  m.shareFile.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("saveTextFile in the browser", () => {
  it("starts a normal download and never calls the native plugin", async () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.isConnected).toBe(true);
      expect(this.download).toBe("daten.json");
      expect(this.href).toBe("blob:export");
    });
    await expect(saveTextFile({ filename: "daten.json", content: "{}" })).resolves.toBe(
      "downloaded",
    );
    expect(click).toHaveBeenCalledOnce();
    expect((create.mock.calls[0]![0] as Blob).type).toBe("application/json;charset=utf-8");
    expect(document.querySelector("a[download]")).toBeNull();
    expect(m.shareFile).not.toHaveBeenCalled();
  });
});

describe("saveTextFile in the iOS app", () => {
  beforeEach(() => {
    m.native = true;
  });

  it("passes the file to the native share sheet instead of a Blob download", async () => {
    const create = vi.spyOn(URL, "createObjectURL");
    m.shareFile.mockResolvedValue({ completed: true });
    await expect(saveTextFile({ filename: "daten.json", content: '{"a":1}' })).resolves.toBe(
      "shared",
    );
    expect(m.shareFile).toHaveBeenCalledWith({ filename: "daten.json", content: '{"a":1}' });
    expect(m.registered).toContain("FileShare");
    expect(create).not.toHaveBeenCalled();
  });

  it("reports a closed share sheet as cancelled, not as success", async () => {
    m.shareFile.mockResolvedValue({ completed: false });
    await expect(saveTextFile({ filename: "daten.json", content: "{}" })).resolves.toBe(
      "cancelled",
    );
  });

  it("passes native failures on", async () => {
    m.shareFile.mockRejectedValue(new Error("WRITE_FAILED"));
    await expect(saveTextFile({ filename: "daten.json", content: "{}" })).rejects.toThrow(
      "WRITE_FAILED",
    );
  });
});

describe("native FileShare plugin", () => {
  const swift = read("ios/App/App/FileSharePlugin.swift");

  it("is compiled into the app and registered with the bridge", () => {
    expect(read("ios/App/App/MainViewController.swift")).toContain(
      "registerPluginInstance(FileSharePlugin())",
    );
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(project).toContain("FileSharePlugin.swift in Sources */ = {isa = PBXBuildFile;");
    expect(project.match(/FileSharePlugin\.swift in Sources \*\/,/g)).toHaveLength(1);
    expect(swift).toContain('public let jsName = "FileShare"');
    expect(swift).toContain(
      'CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise)',
    );
  });

  it("uses the share sheet with an iPad popover anchor and reports completion", () => {
    expect(swift).toContain("UIActivityViewController(activityItems: [url]");
    expect(swift).toMatch(/popover\.sourceView = presenter\.view/);
    expect(swift).toMatch(/popover\.sourceRect = /);
    expect(swift).toContain('call.resolve(["completed": completed])');
  });

  it("writes a protected temporary file with a plain name and removes it afterwards", () => {
    expect(swift).toContain("FileManager.default.temporaryDirectory");
    expect(swift).toContain(".completeFileProtection");
    expect(swift).toMatch(/!name\.hasPrefix\("\."\)/);
    expect(swift.match(/removeItem\(at: url\)/g)!.length).toBeGreaterThanOrEqual(2);
    expect(swift).not.toMatch(/\b(print|NSLog|os_log|debugPrint)\(|Logger\(/);
  });

  it("does not change HealthKit permissions", () => {
    expect(swift).not.toContain("HealthKit");
    expect(read("ios/App/App/App.entitlements")).not.toContain("background-delivery");
  });
});
