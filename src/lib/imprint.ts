/** Verbatim legal text from https://fairvital.com/Impressum. */
export const imprintSections = [
  { title: "Fairvital Online Shop", text: `Fairvital B.V.

Eurode Park 1-39, NL-6461 KB Kerkrade

Rechtsform: Besloten vennootschap

Vertretungsberechtigter Gesellschafter: Manju B.V.

Registergericht: Kamer von Koophandel Zuid-Limburg

Handelsregisternummer: 14087142` },
  { title: "Umsatzsteuer-Identifikationsnummern:", text: `NL815372103B01

DE246819800

FR10813883899

IT00196229991

PL5263152365

ESN0030810F

CZ683817988

GB273324707` },
  { text: "Plattform der EU-Kommission zur Online-Streitbeilegung: ", links: [{ label: "https://ec.europa.eu/consumers/odr", href: "https://ec.europa.eu/consumers/odr" }] },
  { text: `Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.

Mitglied der Initiative "Fairness im Handel".` },
  { text: "Nähere Informationen: ", links: [{ label: "http://www.fairness-im-handel.de", href: "http://www.fairness-im-handel.de/" }] },
  { title: "Kontoverbindungen:", text: `(D) Volksbank Mittelhessen

IBAN: DE10 5139 0000 0006 5091 77

BIC: VBMHDE5FXXX

(A) Oberbank

IBAN: AT64 1500 0003 5107 9207

BIC: OBKLAT2LXXX

Kundenservice: Werktags 8:00-16:00:
0031-43 74 104 49` },
  { title: "Sie erreichen uns täglich rund um die Uhr!", text: `international gebührenfrei 00800-11 77 99 33

gebührenfrei aus Deutschland 0800-11 77 99 3

gebührenfrei aus Großbritannien 0800-27 92 889

gebührenfrei aus Frankreich 0800-94 16 98

gebührenfrei aus Spanien 800-60 05 47

gebührenfrei aus Italien 800-14 69 64

Fax: 00800-11 77 99 11 gebührenfrei aus Deutschland, Österreich, Schweiz

Fax: +31-20 718 37 27` },
  { text: "E-Mail: ", links: [{ label: "info@fairvital.com", href: "mailto:info@fairvital.com", prefix: "" }, { prefix: ", Internet: ", label: "www.fairvital.com", href: "http://www.fairvital.com/" }] },
  { text: 'Mitglied der Initiative "Fairness im Handel".' },
  { text: "Informationen zur Initiative: ", links: [{ label: "fairness-im-handel.de", href: "http://www.fairness-im-handel.de/" }] },
] satisfies { title?: string; text: string; links?: { prefix?: string; label: string; href: string }[] }[];