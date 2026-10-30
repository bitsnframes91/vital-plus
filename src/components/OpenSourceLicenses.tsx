import { useState } from "react";
import { Download, Search } from "lucide-react";
import { useLanguage } from "@/components/Localized";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import packages from "@/lib/open-source-licenses.json";

const copy = {
  de: {
    intro: "fairvitalgo verwendet die unten aufgeführten Open-Source-Pakete. Die Übersicht enthält direkte und indirekte Produktionsabhängigkeiten dieser App-Version. Urheberrechte verbleiben bei den jeweiligen Rechteinhabern.",
    search: "Pakete oder Lizenzen suchen", count: "Pakete", direct: "Direkte Abhängigkeit", indirect: "Indirekte Abhängigkeit", download: "Lizenzhinweise herunterladen", empty: "Keine passenden Pakete gefunden.",
    original: "Originale Lizenz- und Urheberrechtshinweise werden unverändert in ihrer Originalsprache wiedergegeben. Maßgeblich sind die jeweiligen Lizenztexte; viele enthalten einen Haftungs- und Gewährleistungsausschluss.",
    missing: "Im installierten Paket wurde keine separate Lizenzdatei gefunden. Die Lizenzangabe stammt aus den Paketinformationen; zusätzliche Hinweise sind beim jeweiligen Projekt zu prüfen.",
    license: "Lizenz", notices: "Lizenztext und Urheberrechtshinweise",
  },
  en: {
    intro: "fairvitalgo uses the open-source packages listed below. This inventory includes direct and indirect production dependencies of this app version. Copyright remains with the respective rights holders.",
    search: "Search packages or licenses", count: "packages", direct: "Direct dependency", indirect: "Indirect dependency", download: "Download license notices", empty: "No matching packages found.",
    original: "Original license and copyright notices are reproduced unchanged in their original language. The individual license texts govern; many include warranty and liability disclaimers.",
    missing: "No separate license file was found in the installed package. The license identifier comes from its package metadata; consult the respective project for additional notices.",
    license: "License", notices: "License text and copyright notices",
  },
  es: {
    intro: "fairvitalgo utiliza los paquetes de código abierto indicados a continuación. Esta lista incluye las dependencias de producción directas e indirectas de esta versión de la app. Los derechos de autor pertenecen a sus respectivos titulares.",
    search: "Buscar paquetes o licencias", count: "paquetes", direct: "Dependencia directa", indirect: "Dependencia indirecta", download: "Descargar avisos de licencia", empty: "No se encontraron paquetes coincidentes.",
    original: "Los avisos originales de licencia y derechos de autor se reproducen sin cambios en su idioma original. Rigen los textos de cada licencia; muchos incluyen exclusiones de garantía y responsabilidad.",
    missing: "No se encontró un archivo de licencia separado en el paquete instalado. El identificador de licencia procede de sus metadatos; consulta el proyecto correspondiente para obtener avisos adicionales.",
    license: "Licencia", notices: "Texto de licencia y avisos de derechos de autor",
  },
};

export function OpenSourceLicenses() {
  const language = useLanguage();
  const text = copy[language];
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const matches = packages.filter(p => `${p.name} ${p.license}`.toLowerCase().includes(search));
  return <article className="space-y-4 text-sm leading-6">
    <p className="text-muted-foreground">{text.intro}</p>
    <p className="text-muted-foreground">{text.original}</p>
    <Button variant="outline" asChild className="h-auto whitespace-normal py-2"><a href="/open-source-notices.txt" download><Download className="size-4 shrink-0" />{text.download}</a></Button>
    <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label={text.search} placeholder={text.search} value={query} onChange={e => setQuery(e.target.value)} className="h-10 pl-9" /></div>
    <p aria-live="polite" className="text-xs text-muted-foreground">{matches.length} / {packages.length} {text.count}</p>
    <div className="divide-y divide-border">
      {matches.map(p => <details key={`${p.name}@${p.version}`} className="py-3">
        <summary className="cursor-pointer break-words text-foreground">
          <span className="font-semibold">{p.name}</span> <span className="text-xs text-muted-foreground">{p.version}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{text.license}: {p.license} · {p.direct ? text.direct : text.indirect}</span>
        </summary>
        <div className="mt-3 space-y-3">
          <h3 className="font-semibold">{text.notices}</h3>
          {p.notices.length ? p.notices.map(n => <section key={n.file}><h4 className="text-xs font-semibold text-muted-foreground">{n.file}</h4><pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-muted-foreground">{n.text}</pre></section>) : <p className="text-muted-foreground">{text.missing}</p>}
        </div>
      </details>)}
    </div>
    {!matches.length && <p className="text-muted-foreground">{text.empty}</p>}
  </article>;
}