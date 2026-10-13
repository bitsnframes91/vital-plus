import { describe, expect, it } from "vitest";
import { greetingFor } from "@/lib/greeting";

const at = (hour: number) => new Date(`2026-10-13T${String(hour).padStart(2, "0")}:30:00`);

describe("Tageszeit-Anrede", () => {
  it("greets with Guten Morgen only before 11:00", () => {
    expect(greetingFor(at(0))).toBe("Guten Morgen");
    expect(greetingFor(at(8))).toBe("Guten Morgen");
    expect(greetingFor(at(10))).toBe("Guten Morgen");
  });

  it("greets with Guten Tag from 11:00 until 18:00", () => {
    expect(greetingFor(at(11))).toBe("Guten Tag");
    expect(greetingFor(at(14))).toBe("Guten Tag");
    expect(greetingFor(at(17))).toBe("Guten Tag");
  });

  it("greets with Guten Abend from 18:00", () => {
    expect(greetingFor(at(18))).toBe("Guten Abend");
    expect(greetingFor(at(23))).toBe("Guten Abend");
  });
});
