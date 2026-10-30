// Bundled privacy statement for Profil → Meine Daten, supplied verbatim by the
// brand owner (German is the source of truth; EN/ES are faithful translations).
// Kept as a data module so the wording stays reviewable and legal text is never
// machine-translated at runtime.

export type PrivacyStandardsCopy = {
  headline: string;
  intro: string;
  standardsTitle: string;
  standards: [string, string][];
  legalTitle: string;
  legalIntro: string;
  legal: [string, string][];
  closing: string;
};

export const privacyStandards: Record<"de" | "en" | "es", PrivacyStandardsCopy> = {
  de: {
    headline: "Deine Gesundheit. Deine Daten. Deine Privatsphäre.",
    intro:
      "Bei fairvitalgo® stehen der Schutz und die Vertraulichkeit deiner persönlichen Gesundheitsdaten an erster Stelle. Dafür setzen wir auf ein besonders strenges Datenschutzkonzept nach der europäischen Datenschutz-Grundverordnung (DSGVO).",
    standardsTitle: "Unsere besonderen Datenschutzstandards:",
    standards: [
      ["Serverstandort Deutschland", "Deine persönlichen Gesundheitsdaten werden ausschließlich auf geschützten Servern in Deutschland gespeichert und verarbeitet."],
      ["Keine Weitergabe ins Ausland", "Deine Gesundheitsdaten werden nicht an Server oder Dienstleister außerhalb Deutschlands übertragen."],
      ["Keine Datenweitergabe zu fremden Zwecken", "Wir verkaufen deine Daten nicht und nutzen sie weder für fremde Werbung noch zum Training externer KI-Modelle."],
      ["Sichere Datenaufbewahrung", "Deine Gesundheitsdaten werden verschlüsselt übertragen, vor unbefugtem Zugriff geschützt und nur so lange gespeichert, wie es für die von dir gewünschten Funktionen erforderlich ist."],
      ["Vollständige Kontolöschung", "Du kannst jederzeit die Löschung deines Kontos und deiner persönlichen Gesundheitsdaten veranlassen. Die Daten werden aus den aktiven Systemen entfernt; geschützte Sicherungskopien werden innerhalb festgelegter Löschfristen bereinigt, soweit keine gesetzlichen Aufbewahrungspflichten bestehen."],
      ["Volle Kontrolle", "Du entscheidest, welche Gesundheitsinformationen du hinterlegst, kannst deine Einwilligung widerrufen und deine Daten exportieren."],
    ],
    legalTitle: "Unsere gesetzlichen Datenschutzgrundlagen",
    legalIntro: "Unser Datenschutzkonzept berücksichtigt insbesondere folgende Bestimmungen der DSGVO:",
    legal: [
      ["Art. 5 DSGVO", "Datenminimierung, Zweckbindung und Speicherbegrenzung."],
      ["Art. 6 und 9 DSGVO", "Rechtmäßige Verarbeitung und besonderer Schutz sensibler Gesundheitsdaten."],
      ["Art. 7 DSGVO", "Freiwillige Einwilligung und jederzeitiges Widerrufsrecht."],
      ["Art. 17 DSGVO", "Recht auf Löschung personenbezogener Daten."],
      ["Art. 20 DSGVO", "Recht auf Datenübertragbarkeit."],
      ["Art. 25 DSGVO", "Datenschutz durch Technikgestaltung und datenschutzfreundliche Voreinstellungen."],
      ["Art. 28 DSGVO", "Verpflichtung und Kontrolle beauftragter Dienstleister."],
      ["Art. 32 DSGVO", "Sicherheit der Verarbeitung und Schutz vor unberechtigten Zugriffen."],
    ],
    closing: "fairvitalgo® – Weil deine Gesundheit Privatsache ist.",
  },
  en: {
    headline: "Your health. Your data. Your privacy.",
    intro:
      "At fairvitalgo®, the protection and confidentiality of your personal health data come first. That is why we follow an especially strict data-protection concept under the European General Data Protection Regulation (GDPR).",
    standardsTitle: "Our particular data-protection standards:",
    standards: [
      ["Servers located in Germany", "Your personal health data is stored and processed exclusively on protected servers in Germany."],
      ["No transfer abroad", "Your health data is not passed on to servers or service providers outside Germany."],
      ["No data sharing for unrelated purposes", "We do not sell your data and do not use it for third-party advertising or for training external AI models."],
      ["Secure data storage", "Your health data is transmitted encrypted, protected against unauthorised access and stored only for as long as the features you have chosen require."],
      ["Complete account deletion", "You can request the deletion of your account and your personal health data at any time. The data is removed from the active systems; protected backups are cleared within defined deletion periods, unless statutory retention obligations apply."],
      ["Full control", "You decide which health information you provide, you can withdraw your consent and you can export your data."],
    ],
    legalTitle: "Our legal data-protection basis",
    legalIntro: "Our data-protection concept takes particular account of the following GDPR provisions:",
    legal: [
      ["Art. 5 GDPR", "Data minimisation, purpose limitation and storage limitation."],
      ["Art. 6 and 9 GDPR", "Lawful processing and the special protection of sensitive health data."],
      ["Art. 7 GDPR", "Voluntary consent and the right to withdraw it at any time."],
      ["Art. 17 GDPR", "Right to erasure of personal data."],
      ["Art. 20 GDPR", "Right to data portability."],
      ["Art. 25 GDPR", "Data protection by design and by default."],
      ["Art. 28 GDPR", "Obligations and oversight of commissioned processors."],
      ["Art. 32 GDPR", "Security of processing and protection against unauthorised access."],
    ],
    closing: "fairvitalgo® – Because your health is a private matter.",
  },
  es: {
    headline: "Tu salud. Tus datos. Tu privacidad.",
    intro:
      "En fairvitalgo®, la protección y la confidencialidad de tus datos personales de salud son lo primero. Por eso aplicamos un concepto de protección de datos especialmente estricto conforme al Reglamento General de Protección de Datos (RGPD) europeo.",
    standardsTitle: "Nuestros estándares especiales de protección de datos:",
    standards: [
      ["Servidores en Alemania", "Tus datos personales de salud se almacenan y procesan exclusivamente en servidores protegidos en Alemania."],
      ["Sin transferencia al extranjero", "Tus datos de salud no se transfieren a servidores ni a proveedores fuera de Alemania."],
      ["Sin cesión de datos para fines ajenos", "No vendemos tus datos ni los usamos para publicidad de terceros ni para entrenar modelos externos de IA."],
      ["Almacenamiento seguro de datos", "Tus datos de salud se transmiten cifrados, están protegidos frente a accesos no autorizados y se conservan solo el tiempo que requieran las funciones que has elegido."],
      ["Eliminación completa de la cuenta", "Puedes solicitar en cualquier momento la eliminación de tu cuenta y de tus datos personales de salud. Los datos se retiran de los sistemas activos; las copias de seguridad protegidas se depuran dentro de los plazos de eliminación establecidos, salvo obligaciones legales de conservación."],
      ["Control total", "Tú decides qué información de salud proporcionas, puedes retirar tu consentimiento y puedes exportar tus datos."],
    ],
    legalTitle: "Nuestras bases legales de protección de datos",
    legalIntro: "Nuestro concepto de protección de datos tiene especialmente en cuenta las siguientes disposiciones del RGPD:",
    legal: [
      ["Art. 5 RGPD", "Minimización de datos, limitación de la finalidad y limitación del almacenamiento."],
      ["Art. 6 y 9 RGPD", "Tratamiento lícito y protección especial de los datos de salud sensibles."],
      ["Art. 7 RGPD", "Consentimiento voluntario y derecho a retirarlo en cualquier momento."],
      ["Art. 17 RGPD", "Derecho a la supresión de los datos personales."],
      ["Art. 20 RGPD", "Derecho a la portabilidad de los datos."],
      ["Art. 25 RGPD", "Protección de datos desde el diseño y por defecto."],
      ["Art. 28 RGPD", "Obligaciones y control de los encargados del tratamiento."],
      ["Art. 32 RGPD", "Seguridad del tratamiento y protección frente a accesos no autorizados."],
    ],
    closing: "fairvitalgo® – Porque tu salud es un asunto privado.",
  },
};
