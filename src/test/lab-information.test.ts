import { describe, expect, it } from "vitest";
import { labInformation } from "@/lib/lab-information";
import type { LabMarker } from "@/lib/data";
const marker = (value: number): LabMarker => ({ id: "pdf-marker", name: "Ferritin", unit: "µg/l", target: [30, 150], history: [{ date: "2026-10-11", value }], note: "", retestWeeks: 8 });
describe("lab information direction", () => {
  it("adds a reason below the range", () => {
    expect(labInformation(marker(22)).direction).toBe("low");
    expect(labInformation(marker(22)).reason).not.toBeNull();
  });
  it("adds a reason above the range", () => {
    expect(labInformation(marker(160)).direction).toBe("high");
    expect(labInformation(marker(160)).reason).not.toBeNull();
  });
  it.each([30, 90, 150])("omits out-of-range reasons for %s", value => {
    expect(labInformation(marker(value)).reason).toBeNull();
  });
  it("does not classify missing measurements", () => {
    expect(labInformation({ ...marker(22), history: [] }).direction).toBeNull();
  });
});
