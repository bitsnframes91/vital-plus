import type { LabMarker } from "./data";
import explanations from "./lab-information-data.json";
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function labInformation(marker: LabMarker) {
  const name = ` ${normalize(marker.name)} `;
  const known = Object.entries(explanations).find(([id, entry]) => marker.id === id || entry.aliases.some(alias => name.includes(` ${alias} `)))?.[1];
  const value = marker.history.at(-1)?.value;
  const direction = value === undefined || !Number.isFinite(value) ? null : value < marker.target[0] ? "low" : value > marker.target[1] ? "high" : null;
  return {
    direction,
    definition: known?.definition ?? "Dieser Laborwert hilft, einen Teil deiner Körperfunktionen einzuschätzen; seine genaue Bedeutung hängt von der Messmethode und dem Befund ab.",
    reason: direction === "low" ? known?.low ?? "Niedrige Werte können je nach Marker mit Ernährung, Medikamenten oder Erkrankungen zusammenhängen."
      : direction === "high" ? known?.high ?? "Hohe Werte können je nach Marker mit Ernährung, Medikamenten oder Erkrankungen zusammenhängen." : null,
  };
}
