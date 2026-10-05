import type { LabMarker } from "./data";
import { markerCategory } from "./plan-products";

export type RoutineTip = { icon: "food" | "sun" | "walk" | "clock" | "heart"; title: string; text: string };

const routines: Record<string, RoutineTip[]> = {
  ferritin: [
    { icon: "food", title: "Eisen und Vitamin C kombinieren", text: "Zum Beispiel Linsen mit Paprika oder Zitrone essen. Vitamin C kann die Aufnahme von pflanzlichem Eisen unterstützen." },
    { icon: "clock", title: "Kaffee und Tee versetzt trinken", text: "Kaffee und schwarzen Tee lieber mit etwas Abstand zu eisenreichen Mahlzeiten genießen." },
    { icon: "food", title: "Eisenquellen abwechseln", text: "Hülsenfrüchte, Vollkornprodukte, Nüsse und je nach Ernährungsweise mageres Fleisch liefern Eisen aus dem Essen." },
  ],
  omega: [
    { icon: "food", title: "Fisch bewusst einplanen", text: "Wenn du Fisch isst, wähle regelmäßig fettreichen Seefisch. Alternativ können Algenprodukte eine Option sein." },
    { icon: "food", title: "Pflanzliche Fette ergänzen", text: "Walnüsse, Leinsamen und Rapsöl lassen sich leicht in Mahlzeiten einbauen." },
    { icon: "walk", title: "Bewegung unterstützt die Fettbalance", text: "Regelmäßige Bewegung an den meisten Tagen wirkt sich günstig auf die Blutfette aus." },
  ],
  vitd: [
    { icon: "sun", title: "Zeit im Freien verbringen", text: "Regelmäßig nach draußen gehen. Wie viel Vitamin D die Haut bildet, hängt unter anderem von Jahreszeit und Hauttyp ab; Sonnenschutz bleibt wichtig." },
    { icon: "food", title: "Lebensmittel einplanen", text: "Fettreicher Fisch oder Eier können zur Vitamin-D-Zufuhr beitragen." },
    { icon: "sun", title: "Mittagslicht nutzen", text: "Schon ein kurzer Aufenthalt draußen zur Mittagszeit kann in den helleren Monaten einen Unterschied machen." },
  ],
  b12: [
    { icon: "food", title: "B12-Quellen prüfen", text: "Tierische Lebensmittel enthalten Vitamin B12. Bei veganer Ernährung sind angereicherte Produkte allein oft nicht ausreichend." },
    { icon: "heart", title: "Ursache ärztlich klären", text: "Ein niedriger B12-Wert kann auch mit der Aufnahme im Körper zusammenhängen. Lass ihn medizinisch einordnen." },
    { icon: "food", title: "Regelmäßig B12-Quellen essen", text: "Eier, Milchprodukte, Fisch oder angereicherte Produkte regelmäßig in den Speiseplan einbauen." },
  ],
  folate: [
    { icon: "food", title: "Mehr Blattgemüse einbauen", text: "Spinat, Feldsalat und Hülsenfrüchte sind alltagstaugliche Folatquellen." },
    { icon: "food", title: "Schonend zubereiten", text: "Gemüse möglichst frisch und nicht länger als nötig garen." },
    { icon: "food", title: "Vollkorn statt Weißmehl", text: "Vollkornbrot und Vollkornreis liefern deutlich mehr Folat als die hellen Varianten." },
  ],
  magnesium: [
    { icon: "food", title: "Nüsse und Kerne nutzen", text: "Eine kleine Portion Kürbiskerne, Mandeln oder Vollkornprodukte passt in viele Mahlzeiten." },
    { icon: "food", title: "Hülsenfrüchte einplanen", text: "Bohnen und Linsen liefern neben Ballaststoffen auch Magnesium." },
    { icon: "clock", title: "Stressphasen beachten", text: "In stressigen Zeiten steigt der Magnesiumbedarf. Dann besonders auf magnesiumreiche Mahlzeiten achten." },
  ],
  zinc: [
    { icon: "food", title: "Zinkquellen einbauen", text: "Kürbiskerne, Haferflocken, Käse oder Fleisch können zur Zinkzufuhr beitragen." },
    { icon: "food", title: "Hülsenfrüchte vorbereiten", text: "Einweichen und gründliches Garen kann die Verfügbarkeit von Mineralstoffen verbessern." },
    { icon: "food", title: "Tierische und pflanzliche Quellen mischen", text: "Zink aus Fleisch, Käse und Eiern wird gut aufgenommen; pflanzliche Quellen ergänzen die Zufuhr." },
  ],
  selenium: [
    { icon: "food", title: "Abwechslungsreich essen", text: "Fisch, Eier und andere proteinreiche Lebensmittel können Selen liefern; der Gehalt schwankt je nach Herkunft." },
    { icon: "heart", title: "Menge besprechen", text: "Selen sollte nicht ungezielt hoch dosiert werden. Kläre deinen Wert vor der Einnahme ab." },
    { icon: "food", title: "Paranüsse in kleiner Menge", text: "Schon ein bis zwei Paranüsse am Tag können einen relevanten Beitrag zur Selenzufuhr leisten." },
  ],
  calcium: [
    { icon: "food", title: "Calciumquellen verteilen", text: "Milchprodukte oder calciumangereicherte Pflanzendrinks lassen sich über den Tag verteilen." },
    { icon: "food", title: "Mineralwasser prüfen", text: "Ein calciumreiches Mineralwasser kann die tägliche Zufuhr ergänzen." },
    { icon: "walk", title: "Belastung stärkt die Knochen", text: "Gehen, Treppensteigen und leichtes Krafttraining unterstützen den Knochenstoffwechsel." },
  ],
  copper: [
    { icon: "food", title: "Vielfältige Quellen wählen", text: "Nüsse, Hülsenfrüchte und Vollkornprodukte liefern Kupfer." },
    { icon: "heart", title: "Ursache abklären", text: "Besprich den Befund ärztlich, insbesondere wenn du bereits Zinkpräparate einnimmst." },
    { icon: "food", title: "Kakao und Bitterschokolade", text: "Dunkle Schokolade mit hohem Kakaoanteil liefert neben Genuss auch Kupfer." },
  ],
  vita: [
    { icon: "food", title: "Buntes Gemüse essen", text: "Karotten, Süßkartoffeln und grünes Blattgemüse liefern Provitamin A." },
    { icon: "food", title: "Mit etwas Fett kombinieren", text: "Ein wenig Öl zum Gemüse hilft bei der Aufnahme fettlöslicher Pflanzenstoffe." },
    { icon: "food", title: "Orange und grün kombinieren", text: "Karotten, Kürbis, Spinat und Grünkohl auf dem Teller abwechseln – so bleibt die Versorgung stabil." },
  ],
  vitc: [
    { icon: "food", title: "Frisches Obst und Gemüse", text: "Paprika, Beeren und Zitrusfrüchte sind praktische Vitamin-C-Quellen." },
    { icon: "food", title: "Schonend zubereiten", text: "Gemüse nicht unnötig lange kochen, damit weniger Vitamin C verloren geht." },
    { icon: "food", title: "Rohkost einplanen", text: "Ein täglicher roher Snack wie Paprika, Apfel oder Beeren sichert die Vitamin-C-Zufuhr." },
  ],
  vite: [
    { icon: "food", title: "Pflanzliche Öle nutzen", text: "Sonnenblumenöl und andere Pflanzenöle können Vitamin E liefern." },
    { icon: "food", title: "Nüsse einbauen", text: "Mandeln und Haselnüsse passen als kleine Ergänzung zu Mahlzeiten." },
    { icon: "food", title: "Avocado und Vollkorn nutzen", text: "Avocado, Vollkornprodukte und Keimlinge ergänzen die Vitamin-E-Zufuhr im Alltag." },
  ],
  vitk: [
    { icon: "food", title: "Grünes Gemüse wählen", text: "Brokkoli, Spinat und Grünkohl sind Vitamin-K-Quellen." },
    { icon: "heart", title: "Bei Medikamenten nachfragen", text: "Wenn du Gerinnungshemmer einnimmst, besprich Änderungen deiner Vitamin-K-Zufuhr mit deiner Praxis." },
    { icon: "food", title: "Fermentiertes probieren", text: "Sauerkraut und andere fermentierte Gemüse liefern Vitamin K und Abwechslung auf den Teller." },
  ],
};

// Common markers that PDF analyses import but that have no nutrient product match.
// They get their own actionable tips instead of falling through to general advice.
const hemoglobinTips: RoutineTip[] = [
  { icon: "food", title: "Eisenreiche Mahlzeiten wählen", text: "Hülsenfrüchte, Vollkornprodukte oder je nach Ernährungsweise mageres Fleisch liefern Eisen aus dem Essen." },
  { icon: "food", title: "Mit Vitamin C kombinieren", text: "Paprika, Zitrusfrüchte oder Beeren zur Mahlzeit können die Eisenaufnahme aus der Nahrung unterstützen." },
  { icon: "clock", title: "Kaffee und Tee versetzt trinken", text: "Kaffee und schwarzer Tee mit etwas Abstand zu den Mahlzeiten genießen." },
  { icon: "heart", title: "Ursache ärztlich einordnen", text: "Ein Hämoglobinwert unter dem Zielbereich kann verschiedene Ursachen haben. Lass ihn ärztlich abklären, besonders bei Müdigkeit oder Schwindel." },
];
const lipidTips: RoutineTip[] = [
  { icon: "walk", title: "Bewegung in den Alltag einbauen", text: "Zügiges Gehen, Radfahren oder Treppensteigen an den meisten Tagen wirken sich günstig auf die Blutfette aus." },
  { icon: "food", title: "Gute Fette wählen", text: "Olivenöl, Nüsse und fetter Seefisch statt vielen gehärteten und gesättigten Fetten einsetzen." },
  { icon: "food", title: "Ballaststoffe ergänzen", text: "Haferflocken, Hülsenfrüchte und Gemüse liefern Ballaststoffe, die zur Blutfettbalance beitragen können." },
  { icon: "food", title: "Zucker und Alkohol reduzieren", text: "Weniger Süßes und Alkohol entlastet die Blutfettwerte spürbar." },
];
const glucoseTips: RoutineTip[] = [
  { icon: "clock", title: "Regelmäßige Mahlzeiten einnehmen", text: "Ausgewogene Mahlzeiten mit Protein und Ballaststoffen halten die Energie über den Tag gleichmäßiger." },
  { icon: "food", title: "Ballaststoffe bevorzugen", text: "Vollkorn, Hülsenfrüchte und Gemüse statt stark verarbeiteten Kohlenhydraten wählen." },
  { icon: "walk", title: "Nach dem Essen bewegen", text: "Ein kurzer Spaziergang nach der Mahlzeit kann den Blutzuckerverlauf unterstützen." },
  { icon: "food", title: "Süßgetränke ersetzen", text: "Wasser oder ungesüßter Tee statt Softdrinks und Säften vermeidet starke Blutzuckerspitzen." },
];
const thyroidTips: RoutineTip[] = [
  { icon: "food", title: "Selen und Jod beachten", text: "Seefisch, Eier und Nüsse liefern Nährstoffe, die für die Schilddrüse relevant sind." },
  { icon: "heart", title: "Werte im Zusammenhang besprechen", text: "Schilddrüsenwerte werden immer im Gesamtbild betrachtet. Nimm deine Ergebnisse zum nächsten Arzttermin mit." },
  { icon: "clock", title: "Regelmäßigkeit schafft Ruhe", text: "Feste Schlaf- und Essenszeiten entlasten den Hormonhaushalt und unterstützen das Wohlbefinden." },
];

const specialRoutines: { pattern: RegExp; tips: RoutineTip[] }[] = [
  { pattern: /h[aä]moglobin|hemoglobin|\bhb\b/i, tips: hemoglobinTips },
  { pattern: /cholesterin|cholesterol|\bldl\b|\bhdl\b|triglyzerid|triglycerid/i, tips: lipidTips },
  { pattern: /hba1c|blutzucker|glucose|glukose/i, tips: glucoseTips },
  { pattern: /\btsh\b|\bft3\b|\bft4\b|schilddr/i, tips: thyroidTips },
];

export function routineTips(marker: LabMarker): RoutineTip[] {
  const text = `${marker.id} ${marker.name}`;
  const special = specialRoutines.find((entry) => entry.pattern.test(text));
  if (special) return special.tips;
  const category = markerCategory(marker);
  return category ? routines[category] ?? generalTips : generalTips;
}

export const generalTips: RoutineTip[] = [
  { icon: "food", title: "Bunt und ausgewogen essen", text: "Gemüse, Vollkornprodukte und eine Proteinquelle in jeder Mahlzeit decken viele Nährstoffe ab." },
  { icon: "walk", title: "Täglich in Bewegung bleiben", text: "Etwa 30 Minuten Bewegung am Tag – gerne in kleinen Etappen wie Treppensteigen oder Gehen." },
  { icon: "clock", title: "Schlaf ernst nehmen", text: "Regelmäßige Schlafzeiten unterstützen Erholung und allgemeines Wohlbefinden." },
  { icon: "sun", title: "Tageslicht am Vormittag", text: "Schon 15 Minuten Tageslicht am Vormittag helfen dem inneren Rhythmus und der Stimmung." },
  { icon: "heart", title: "Kleine Pausen einplanen", text: "Kurze bewusste Pausen über den Tag senken Stress und verbessern die Konzentration." },
  { icon: "food", title: "Ausreichend trinken", text: "Etwa 1,5 bis 2 Liter Wasser oder ungesüßter Tee über den Tag verteilt unterstützen Kreislauf und Konzentration." },
];
