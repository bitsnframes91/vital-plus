import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// iOS zooms into a focused text field whose font is below 16px and keeps the zoom after the keyboard
// closes. The native shell (src/mobile/native.css) gives every editable text control 16px.
const root = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const nativeCss = read("src/mobile/native.css");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "test" ? [] : sourceFiles(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

describe("global iOS input zoom rule", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-native-app");
  });

  function mount(html: string, native = true) {
    if (native) document.documentElement.setAttribute("data-native-app", "");
    const style = document.createElement("style");
    style.textContent = nativeCss;
    document.head.append(style);
    document.body.innerHTML = html;
    return (selector: string) => getComputedStyle(document.querySelector(selector)!).fontSize;
  }

  it("gives every text-entry control 16px in the native shell, including dialogs", () => {
    const size = mount(`
      <input id="text" class="text-sm"><input id="email" type="email" class="text-xs">
      <input id="password" type="password" class="text-[13px]"><input id="number" type="number" class="text-sm">
      <input id="search" type="search"><input id="tel" type="tel"><input id="url" type="url">
      <input id="date" type="date"><input id="time" type="time" class="text-xs"><input id="datetime" type="datetime-local">
      <textarea id="area" class="text-sm"></textarea><select id="select" class="text-sm"><option>a</option></select>
      <div role="dialog"><input id="dialog" inputmode="numeric" class="text-sm"></div>
      <div id="editable" contenteditable="true"></div>`);
    for (const id of [
      "text",
      "email",
      "password",
      "number",
      "search",
      "tel",
      "url",
      "date",
      "time",
      "datetime",
      "area",
      "select",
      "dialog",
      "editable",
    ])
      expect(size(`#${id}`), id).toBe("16px");
  });

  it("leaves non-text controls and larger fields alone", () => {
    const size = mount(`
      <input id="checkbox" type="checkbox"><input id="radio" type="radio"><input id="file" type="file">
      <input id="range" type="range"><input id="submit" type="submit"><input id="large" class="text-center text-lg">
      <div id="readonly" contenteditable="false"></div>`);
    for (const id of ["checkbox", "radio", "file", "range", "submit", "large", "readonly"])
      expect(size(`#${id}`), id).not.toBe("16px");
  });

  it("does not apply on the web", () => {
    const size = mount(`<input id="text" class="text-sm">`, false);
    expect(size("#text")).not.toBe("16px");
    expect(read("src/styles.css")).not.toMatch(/data-native-app\][^{]*input/);
  });

  it("has no text field the rule would shrink (sizes above 16px must be exempt)", () => {
    const exempt = new Set(["text-lg", "text-xl", "text-2xl", "text-3xl"]);
    const tooLarge: string[] = [];
    for (const file of sourceFiles(join(root, "src"))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/<(input|textarea|select)\b[\s\S]*?>/g)) {
        for (const token of m[0].match(/text-(?:[2-9]?xl|lg|\[[0-9.]+(?:px|rem)\])/g) ?? []) {
          const px = token.match(/\[([0-9.]+)(px|rem)\]/);
          const larger = px ? Number(px[1]) * (px[2] === "rem" ? 16 : 1) > 16 : true;
          if (larger && !exempt.has(token)) tooLarge.push(`${relative(root, file)}: ${token}`);
        }
      }
    }
    expect(tooLarge).toEqual([]);
  });

  it("keeps the viewport zoomable and does not reset it from script", () => {
    const viewport = read("src/routes/__root.tsx").match(/name: "viewport",[\s\S]*?\},/)?.[0] ?? "";
    expect(viewport).not.toMatch(/maximum-scale|minimum-scale|user-scalable/);
    for (const file of sourceFiles(join(root, "src")))
      expect(readFileSync(file, "utf8"), relative(root, file)).not.toMatch(
        /meta\[name=["']?viewport|name="viewport".*setAttribute/,
      );
  });
});
