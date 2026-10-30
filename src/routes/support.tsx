import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "@/components/Localized";
import { PublicLegalPage, validateLegalSearch } from "@/components/PublicLegalPage";
import type { Language } from "@/lib/language";

// Public support page (App Store Connect "Support URL").
export const Route = createFileRoute("/support")({
  staticData: { sitemap: true },
  validateSearch: validateLegalSearch,
  head: () => ({
    meta: [
      { title: "Support — fairvitalgo" },
      { name: "description", content: "Hilfe und Kontakt zur App fairvitalgo." },
      { property: "og:title", content: "Support — fairvitalgo" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Support,
});

const copy: Record<
  Language,
  {
    title: string;
    contact: string;
    email: string;
    phone: string;
    faq: [string, string][];
    note: string;
  }
> = {
  de: {
    title: "Hilfe und Kontakt",
    contact: "Du erreichst den fairvitalgo-Kundenservice von Fairvital per E-Mail oder Telefon.",
    email: "E-Mail",
    phone: "Telefon",
    faq: [
      [
        "Wie lösche ich mein Konto?",
        "In der App unter Profil → Meine Daten → Konto löschen. Du bestätigst die Löschung mit einem Code, den wir dir per E-Mail senden. Dabei werden dein Konto und deine gespeicherten Gesundheitsdaten gelöscht.",
      ],
      [
        "Wie lade ich meine Daten herunter?",
        "Unter Profil → Meine Daten → Meine Daten herunterladen erhältst du eine JSON-Datei mit deinen gespeicherten Daten. In der iOS-App kannst du sie über „In Dateien sichern“ ablegen.",
      ],
      [
        "Wie widerrufe ich meine Einwilligungen?",
        "Unter Profil → Meine Daten kannst du die Einwilligung zu Gesundheitsdaten und die Erlaubnis für KI-Auswertungen durch Drittanbieter jeweils widerrufen.",
      ],
      [
        "Wie trenne ich Apple Health?",
        "In den iOS-Einstellungen unter Health → Datenzugriff & Geräte → FairVital Go kannst du alle Freigaben ausschalten. Daten in Apple Health bleiben dabei unverändert.",
      ],
      [
        "Ich habe mein Passwort vergessen.",
        "Auf der Anmeldeseite kannst du über „Passwort vergessen?“ einen Link zum Zurücksetzen anfordern oder dich mit einem Code per E-Mail anmelden.",
      ],
    ],
    note: "fairvitalgo ersetzt keine ärztliche Beratung, Diagnose oder Behandlung. Bei akuten Beschwerden wende dich an den örtlichen Notdienst.",
  },
  en: {
    title: "Help and contact",
    contact: "You can reach Fairvital's fairvitalgo customer service by email or phone.",
    email: "Email",
    phone: "Phone",
    faq: [
      [
        "How do I delete my account?",
        "In the app, go to Profile → My data → Delete account. You confirm deletion with a code we send to your email. Your account and stored health data are then deleted.",
      ],
      [
        "How do I download my data?",
        "Under Profile → My data → Download my data you receive a JSON file with your stored data. In the iOS app you can keep it with “Save to Files”.",
      ],
      [
        "How do I withdraw consent?",
        "Under Profile → My data you can withdraw your health-data consent and your permission for AI analysis by third-party providers separately.",
      ],
      [
        "How do I disconnect Apple Health?",
        "In iOS Settings under Health → Data Access & Devices → FairVital Go you can turn off all permissions. Data in Apple Health stays unchanged.",
      ],
      [
        "I forgot my password.",
        "On the sign-in screen, use “Forgot password?” to request a reset link, or sign in with a code sent to your email.",
      ],
    ],
    note: "fairvitalgo does not replace medical advice, diagnosis or treatment. For acute symptoms contact local emergency services.",
  },
  es: {
    title: "Ayuda y contacto",
    contact:
      "Puedes contactar con el servicio de atención de fairvitalgo de Fairvital por correo o teléfono.",
    email: "Correo",
    phone: "Teléfono",
    faq: [
      [
        "¿Cómo elimino mi cuenta?",
        "En la app, ve a Perfil → Mis datos → Eliminar cuenta. Confirmas la eliminación con un código que te enviamos por correo. Entonces se eliminan tu cuenta y tus datos de salud guardados.",
      ],
      [
        "¿Cómo descargo mis datos?",
        "En Perfil → Mis datos → Descargar mis datos recibes un archivo JSON con tus datos guardados. En la app de iOS puedes guardarlo con «Guardar en Archivos».",
      ],
      [
        "¿Cómo retiro mi consentimiento?",
        "En Perfil → Mis datos puedes retirar por separado el consentimiento para datos de salud y el permiso para análisis con IA por proveedores externos.",
      ],
      [
        "¿Cómo desconecto Apple Salud?",
        "En Ajustes de iOS, en Salud → Acceso a datos y dispositivos → FairVital Go, puedes desactivar todos los permisos. Los datos en Apple Salud no cambian.",
      ],
      [
        "He olvidado mi contraseña.",
        "En la pantalla de inicio de sesión, usa «¿Olvidaste tu contraseña?» para solicitar un enlace o inicia sesión con un código enviado a tu correo.",
      ],
    ],
    note: "fairvitalgo no sustituye el consejo médico, el diagnóstico ni el tratamiento. Ante síntomas agudos contacta con los servicios de emergencia locales.",
  },
};

function Support() {
  const appLanguage = useLanguage();
  const lang = Route.useSearch().lang ?? appLanguage;
  const c = copy[lang];
  return (
    <PublicLegalPage lang={lang} title={c.title}>
      <section className="space-y-2">
        <p className="text-muted-foreground">{c.contact}</p>
        <p>
          {c.email}:{" "}
          <a
            className="font-semibold text-primary underline underline-offset-4"
            href="mailto:service@fairvital.com"
          >
            service@fairvital.com
          </a>
        </p>
        <p>
          {c.phone}:{" "}
          <a
            className="font-semibold text-primary underline underline-offset-4"
            href="tel:+4922342190482"
          >
            +49 2234 2190482
          </a>
        </p>
      </section>
      {c.faq.map(([q, a]) => (
        <section key={q}>
          <h2 className="mb-2 font-semibold">{q}</h2>
          <p className="text-muted-foreground">{a}</p>
        </section>
      ))}
      <p className="rounded-2xl bg-muted p-4 text-muted-foreground">{c.note}</p>
    </PublicLegalPage>
  );
}
