/** Verbatim legal text from https://fairvital.com/Impressum. The leading heading names this app and is localized. */
export const imprintSections = [
  { title: "Vitalplus von Fairvital", text: `Fairvital B.V.

Eurode Park 1-39, NL-6461 KB Kerkrade

Rechtsform: Besloten vennootschap

Vertretungsberechtigter Gesellschafter: Manju B.V.

Registergericht: Kamer von Koophandel Zuid-Limburg

Handelsregisternummer: 14087142` },
  { text: "Plattform der EU-Kommission zur Online-Streitbeilegung: ", links: [{ label: "https://ec.europa.eu/consumers/odr", href: "https://ec.europa.eu/consumers/odr" }] },
  { text: `Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.

Mitglied der Initiative "Fairness im Handel".` },
  { text: "Nähere Informationen: ", links: [{ label: "http://www.fairness-im-handel.de", href: "http://www.fairness-im-handel.de/" }] },
  { text: `Kundenservice (7:00-15:00): +49 2234 2190482 
` },
  { text: "E-Mail: ", links: [{ label: "info@fairvital.com", href: "mailto:info@fairvital.com", prefix: "" }, { prefix: ", Internet: ", label: "www.fairvital.com", href: "http://www.fairvital.com/" }] },
  { text: 'Mitglied der Initiative "Fairness im Handel".' },
  { text: "Informationen zur Initiative: ", links: [{ label: "fairness-im-handel.de", href: "http://www.fairness-im-handel.de/" }] },
] satisfies { title?: string; text: string; links?: { prefix?: string; label: string; href: string }[] }[];