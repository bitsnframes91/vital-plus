import { describe, expect, it } from "vitest";
import { status, type LabMarker } from "@/lib/data";

const marker = (value: number, target: [number, number]): LabMarker => ({
  id: "test-marker",
  name: "Testwert",
  unit: "",
  target,
  history: [{ date: "2026-10-06", value }],
  retestWeeks: 12,
  note: "",
});

describe("lab status levels", () => {
  it("reports Optimal with a smiling tone when the value is in range", () => {
    const st = status(marker(50, [40, 75]));
    expect(st.label).toBe("Optimal");
    expect(st.tone).toBe("ok");
    expect(st.level).toBe("optimal");
  });

  it("reports Hoch with a neutral tone just above the range", () => {
    const st = status(marker(101, [0, 100]));
    expect(st.label).toBe("Hoch");
    expect(st.tone).toBe("warn");
    expect(st.level).toBe("high");
  });

  it("reports Sehr hoch with a red tone 25% or more above the range", () => {
    const st = status(marker(126, [0, 100]));
    expect(st.label).toBe("Sehr hoch");
    expect(st.tone).toBe("severe");
    expect(st.level).toBe("very_high");
  });

  it("reports Niedrig with a neutral tone just below the range", () => {
    const st = status(marker(9, [10, 20]));
    expect(st.label).toBe("Niedrig");
    expect(st.tone).toBe("warn");
    expect(st.level).toBe("low");
  });

  it("reports Sehr niedrig with a red tone well below the range", () => {
    const st = status(marker(7, [10, 20]));
    expect(st.label).toBe("Sehr niedrig");
    expect(st.tone).toBe("severe");
    expect(st.level).toBe("very_low");
  });

  it("counts a value at a zero target minimum as in range", () => {
    const st = status(marker(0, [0, 100]));
    expect(st.label).toBe("Optimal");
    expect(st.level).toBe("optimal");
  });
});
