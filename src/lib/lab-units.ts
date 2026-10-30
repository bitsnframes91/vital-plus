import type { LabMarker } from "./data";

/** German lab conventions; conversion is unit-based, never inferred from magnitude. */
export function europeanLabUnit(unit: string): { unit: string; factor: number } {
  const key = unit.trim().toLowerCase().replace(/\s+/g, "").replace(/μ/g, "µ");
  if (/^lakhs?\/(cumm|mm³|mm3|µl|ul)$/.test(key)) return { unit: "G/l", factor: 100 };
  if (/^(millionen|million|millions|mio\.?)\/(mm³|mm3|cumm|µl|ul)$/.test(key)) return { unit: "T/l", factor: 1 };
  if (/^(zellen|cells)\/(mm³|mm3|cumm|µl|ul)$/.test(key)) return { unit: "G/l", factor: 0.001 };
  if (/^(10\^3|10³|×10³|x10\^3)\/(µl|ul|mm³|mm3)$/.test(key)) return { unit: "G/l", factor: 1 };
  if (/^(10\^6|10⁶|×10⁶|x10\^6)\/(µl|ul|mm³|mm3)$/.test(key)) return { unit: "T/l", factor: 1 };
  if (key === "mg%") return { unit: "mg/dl", factor: 1 };
  if (key === "gm%" || key === "g%" || key === "gm/dl") return { unit: "g/dl", factor: 1 };
  if (key === "fl") return { unit: "fL", factor: 1 };
  if (key === "t/l") return { unit: "T/l", factor: 1 };
  // Unknown units are retained rather than guessed. Europe has no single unit standard.
  return { unit, factor: 1 };
}

export function europeanLabMarker(marker: LabMarker): LabMarker {
  const conversion = europeanLabUnit(marker.unit);
  if (conversion.unit === marker.unit && conversion.factor === 1) return marker;
  const convert = (value: number) => Number((value * conversion.factor).toPrecision(12));
  return {
    ...marker,
    unit: conversion.unit,
    target: [convert(marker.target[0]), convert(marker.target[1])],
    history: marker.history.map(point => ({ ...point, value: convert(point.value) })),
  };
}