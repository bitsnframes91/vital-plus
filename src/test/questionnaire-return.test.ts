import { describe, expect, it } from "vitest";
import { questionnaireReturn } from "../lib/questionnaire-return";

describe("questionnaire editing destination", () => {
  it("returns Profile edits to the personal submenu", () => {
    expect(questionnaireReturn("profile")).toBe("profile");
  });
  it("keeps Gesundheit edits returning to Gesundheit", () => {
    expect(questionnaireReturn(undefined)).toBe("health");
  });
  it("rejects arbitrary return destinations", () => {
    expect(questionnaireReturn("https://example.com")).toBe("health");
  });
});