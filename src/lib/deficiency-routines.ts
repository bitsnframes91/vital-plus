import type { LabMarker } from "./data";
import { markerCategory } from "./plan-products";

export type RoutineTip = { icon: "food" | "sun" | "walk" | "clock" | "heart"; title: string; text: string };

const routines: Record<string, RoutineTip[]> = {
  ferritin: [
    { icon: "food", title: "Eisen und Vitamin C kombinieren", text: "Zum Beispiel Linsen mit Paprika oder Zitrone essen. Vitamin C kann die Aufnahme von pflanzlichem Eisen unterstützen." },
    { icon: "clock", title: "Kaffee und Tee versetzt trinken", text: "Kaffee und schwarzen Tee lieber mit etwas Abstand zu eisenreichen Mahlzeiten genießen." },
  ],
  omega: [
    { icon: "food", title: "Fisch bewusst einplanen", text: "Wenn du Fisch isst, wähle regelmäßig fettreichen Seefisch. Alternativ können Algenprodukte eine Option sein." },
    { icon: "food", title: "Pflanzliche Fette ergänzen", text: "Walnüsse, Leinsamen und Rapsöl lassen sich leicht in Mahlzeiten einbauen." },
  ],
  vitd: [
    { icon: "sun", title: "Zeit im Freien verbringen", text: "Regelmäßig nach draußen gehen. Wie viel Vitamin D die Haut bildet, hängt unter anderem von Jahreszeit und Hauttyp ab; Sonnenschutz bleibt wichtig." },
    { icon: "food", title: "Lebensmittel einplanen", text: "Fettreicher Fisch oder Eier können zur Vitamin-D-Zufuhr beitragen." },
  ],
  b12: [
    { icon: "food", title: "B12-Quellen prüfen", text: "Tierische Lebensmittel enthalten Vitamin B12. Bei veganer Ernährung sind angereicherte Produkte allein oft nicht ausreichend." },
    { icon: "heart", title: "Ursache ärztlich klären", text: "Ein niedriger B12-Wert kann auch mit der Aufnahme im Körper zusammenhängen. Lass ihn medizinisch einordnen." },
  ],
  folate: [
    { icon: "food", title: "Mehr Blattgemüse einbauen", text: "Spinat, Feldsalat und Hülsenfrüchte sind alltagstaugliche Folatquellen." },
    { icon: "food", title: "Schonend zubereiten", text: "Gemüse möglichst frisch und nicht länger als nötig garen." },
  ],
  magnesium: [
    { icon: "food", title: "Nüsse und Kerne nutzen", text: "Eine kleine Portion Kürbiskerne, Mandeln oder Vollkornprodukte passt in viele Mahlzeiten." },
    { icon: "food", title: "Hülsenfrüchte einplanen", text: "Bohnen und Linsen liefern neben Ballaststoffen auch Magnesium." },
  ],
  zinc: [
    { icon: "food", title: "Zinkquellen einbauen", text: "Kürbiskerne, Haferflocken, Käse oder Fleisch können zur Zinkzufuhr beitragen." },
    { icon: "food", title: "Hülsenfrüchte vorbereiten", text: "Einweichen und gründliches Garen kann die Verfügbarkeit von Mineralstoffen verbessern." },
  ],
  selenium: [
    { icon: "food", title: "Abwechslungsreich essen", text: "Fisch, Eier und andere proteinreiche Lebensmittel können Selen liefern; der Gehalt schwankt je nach Herkunft." },
    { icon: "heart", title: "Menge besprechen", text: "Selen sollte nicht ungezielt hoch dosiert werden. Kläre deinen Wert vor der Einnahme ab." },
  ],
  calcium: [
    { icon: "food", title: "Calciumquellen verteilen", text: "Milchprodukte oder calciumangereicherte Pflanzendrinks lassen sich über den Tag verteilen." },
    { icon: "food", title: "Mineralwasser prüfen", text: "Ein calciumreiches Mineralwasser kann die tägliche Zufuhr ergänzen." },
  ],
  copper: [
    { icon: "food", title: "Vielfältige Quellen wählen", text: "Nüsse, Hülsenfrüchte und Vollkornprodukte liefern Kupfer." },
    { icon: "heart", title: "Ursache abklären", text: "Besprich den Befund ärztlich, insbesondere wenn du bereits Zinkpräparate einnimmst." },
  ],
  vita: [
    { icon: "food", title: "Buntes Gemüse essen", text: "Karotten, Süßkartoffeln und grünes Blattgemüse liefern Provitamin A." },
    { icon: "food", title: "Mit etwas Fett kombinieren", text: "Ein wenig Öl zum Gemüse hilft bei der Aufnahme fettlöslicher Pflanzenstoffe." },
  ],
  vitc: [
    { icon: "food", title: "Frisches Obst und Gemüse", text: "Paprika, Beeren und Zitrusfrüchte sind praktische Vitamin-C-Quellen." },
    { icon: "food", title: "Schonend zubereiten", text: "Gemüse nicht unnötig lange kochen, damit weniger Vitamin C verloren geht." },
  ],
  vite: [
    { icon: "food", title: "Pflanzliche Öle nutzen", text: "Sonnenblumenöl und andere Pflanzenöle können Vitamin E liefern." },
    { icon: "food", title: "Nüsse einbauen", text: "Mandeln und Haselnüsse passen als kleine Ergänzung zu Mahlzeiten." },
  ],
  vitk: [
    { icon: "food", title: "Grünes Gemüse wählen", text: "Brokkoli, Spinat und Grünkohl sind Vitamin-K-Quellen." },
    { icon: "heart", title: "Bei Medikamenten nachfragen", text: "Wenn du Gerinnungshemmer einnimmst, besprich Änderungen deiner Vitamin-K-Zufuhr mit deiner Praxis." },
  ],
};

export function routineTips(marker: LabMarker): RoutineTip[] {
  const category = markerCategory(marker);
  return category ? routines[category] ?? generalTips : generalTips;
}

const generalTips: RoutineTip[] = [
  { icon: "heart", title: "Befund einordnen lassen", text: "Besprich den niedrigen Wert und mögliche Ursachen mit deiner Ärztin oder deinem Arzt." },
  { icon: "walk", title: "Gesunde Routinen beibehalten", text: "Regelmäßige Mahlzeiten, Bewegung und ausreichender Schlaf unterstützen dein allgemeines Wohlbefinden." },
];