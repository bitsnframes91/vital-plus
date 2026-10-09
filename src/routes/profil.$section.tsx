import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ChevronRight, UserRound, CalendarDays, UsersRound, Ruler, Weight, Heart, Activity, Mail, KeyRound, Shield, Trash2, Bell, Globe, Moon, Clock, FileText, Download, MessageSquare, CircleHelp, LayoutGrid, Phone, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { activityLevels } from "@/lib/nutrition-targets";
import { goalOptions } from "@/lib/goal-options";

type Field = "age" | "sex" | "height" | "weight" | "activity" | "goals";
const sexOptions = [["female", "Weiblich"], ["male", "Männlich"], ["diverse", "Diverse"], ["unspecified", "Keine Angabe"]] as const;
const numFields = { age: { label: "Alter in Jahren", key: "age", min: 18, max: 110, step: "1" }, height: { label: "Größe in cm", key: "heightCm", min: 120, max: 230, step: "1" }, weight: { label: "Gewicht in kg", key: "weightKg", min: 30, max: 300, step: "0.1" } } as const;
import { PasswordResetForm } from "@/components/PasswordResetForm";
import { AppLockSettings } from "@/components/AppLock";
import { AppSettingsControls } from "@/components/AppSettings";

const titles: Record<string, string> = { personal: "Gesundheitsprofil bearbeiten", security: "Konto & Sicherheit", settings: "App-Einstellungen", privacy: "Meine Daten", help: "Kundenservice kontaktieren", legal: "Rechtliches", account: "Konto verwalten" };

const termsCopy = {
  de: {
    date: "Stand: 9. Oktober 2026",
    draft: "Entwurf zur rechtlichen Prüfung. Angelehnt an die Fairvital-Shop-AGB und für Vitalplus angepasst. Vor verbindlicher Verwendung müssen insbesondere der App-Betreiber und dessen vollständige Anbieterangaben bestätigt werden. Dieser Text allein ersetzt keine wirksame Vereinbarung der Bedingungen.",
    sections: [
      ["1. Geltungsbereich und Anbieter", "Diese Nutzungsbedingungen betreffen die Gesundheits- und Ernährungs-App Vitalplus und deren digitale Funktionen. Die verlinkten Shop-AGB nennen Fairvital BV als Verkäufer von Waren; daraus folgt nicht automatisch, dass Fairvital BV auch Vertragspartner der App-Nutzung ist. Die verbindlichen Anbieterangaben für Vitalplus sind vor Freigabe dieser Bedingungen zu ergänzen. Die App richtet sich an volljährige Personen zur persönlichen Nutzung. Verbraucher ist eine natürliche Person, die überwiegend außerhalb ihrer gewerblichen oder selbständigen beruflichen Tätigkeit handelt."],
      ["2. Registrierung und Nutzerkonto", "Für personalisierte Funktionen ist ein eigenes Konto mit E-Mail-Adresse und Passwort erforderlich. Angaben sollen zutreffend sein; Zugangsdaten sind vertraulich zu behandeln. Bitte verwende eine erreichbare E-Mail-Adresse für Bestätigung, Passwortwiederherstellung und Kontosicherheit. App-Konto und Fairvital-Shop-Konto sind getrennt. Diese Bedingungen werden nicht allein durch das Öffnen dieses Textes akzeptiert; eine rechtlich erforderliche Einbeziehung ist gesondert sicherzustellen."],
      ["3. Funktionen und technische Voraussetzungen", "Vitalplus unterstützt das Erfassen von Körperdaten, Mahlzeiten und Laborwerten sowie das Anzeigen von Zielen, Trends und Vorschlägen. Die App kann als Progressive Web App installiert werden. Internetzugang, ein kompatibles Gerät und gegebenenfalls Kamera-, Mikrofon- oder Benachrichtigungsfreigaben sind erforderlich. Offline stehen nur bereits verfügbare Inhalte zur Verfügung; Anmeldung, Synchronisierung und KI-Auswertung benötigen eine Verbindung. Apple Health und Health Connect liefern nur bei tatsächlich vorhandener Integration und Freigabe Messwerte. Erinnerungen funktionieren derzeit nur, während die App geöffnet ist."],
      ["4. Gesundheitshinweise und KI-Schätzungen", "Vitalplus ersetzt keine ärztliche Untersuchung, Diagnose, Behandlung oder individuelle Ernährungsberatung. Auswertungen von Labor-PDFs und Fotos sowie Sprach- und Essensfoto-Erkennung können fehlerhaft oder unvollständig sein. Kalorien, Protein, Vitamine, Mineralien und Omega-Fette sind Schätzungen, soweit sie nicht auf überprüften Mess- oder Produktdaten beruhen. Prüfe erkannte Angaben am Originalbefund und korrigiere Mahlzeiten bei Bedarf. Referenzwerte sind keine persönlichen medizinischen Grenzwerte; eine geringe geschätzte Tageszufuhr beweist keinen klinischen Mangel. Ändere Medikamente oder Nahrungsergänzungsmittel nicht allein aufgrund der App. Besprich Auffälligkeiten, Schwangerschaft, Vorerkrankungen und mögliche Wechselwirkungen mit qualifiziertem Fachpersonal. Bei akuten Beschwerden wende dich an den örtlichen Notdienst."],
      ["5. Empfehlungen und Fairvital-Shop", "Produktvorschläge orientieren sich an Profilangaben, erfassten Mahlzeiten und gegebenenfalls Laborwerten. Sie sind weder eine Verschreibung noch eine Zusicherung einer bestimmten Wirkung. Vitalplus führt keinen Warenkorb oder Checkout und verkauft keine Produkte innerhalb der App. Ein Produktlink führt zum eigenständigen Fairvital-Shop. Für dort abgeschlossene Käufe gelten ausschließlich die dort vereinbarten Bedingungen, einschließlich Preisen, Zahlung, Lieferung, Widerruf, Gewährleistung und Gutscheinen. Die App begründet keine Bestellung oder Kaufpflicht."],
      ["6. Kosten und Verbraucherrechte", "In der derzeitigen App gibt es keinen Bezahlvorgang für die App-Nutzung. Kosten des Geräts, des Internetzugangs und separat getätigter Shop-Käufe bleiben davon unberührt. Kostenpflichtige App-Angebote bedürfen einer gesonderten transparenten Vereinbarung; aus diesen Bedingungen entsteht kein Abonnement. Gesetzliche Verbraucherrechte, insbesondere gegebenenfalls bestehende Rechte bei digitalen Produkten und ein gesetzliches Widerrufsrecht, bleiben unberührt. Für Warenkäufe ist die Widerrufsbelehrung des Fairvital-Shops maßgeblich."],
      ["7. Eigene Inhalte, Datenschutz und Sicherheit", "Lade nur Inhalte hoch, die du verwenden darfst, und vermeide Befunde oder personenbezogene Daten anderer Personen. Keine rechtswidrigen Inhalte, missbräuchlichen Zugriffe oder Umgehung von Sicherheitsmaßnahmen. Gesundheitsdaten sind besonders sensibel. Einzelheiten zu Verantwortlichem, Verarbeitungszwecken, KI-Dienstleistern, Speicherdauer und Betroffenenrechten müssen in einer gesonderten App-Datenschutzerklärung beschrieben werden; diese AGB ersetzen weder diese Erklärung noch eine erforderliche Einwilligung. Unter Meine Daten kannst du deine gespeicherten Angaben herunterladen und die Kontolöschung anstoßen. App Lock ist eine gerätebezogene Zugangssperre, keine Garantie für Verschlüsselung oder umfassenden Geräteschutz."],
      ["8. Verfügbarkeit, Aktualisierungen und Haftung", "Wartung, Verbindungsprobleme oder Störungen externer Dienste können Funktionen vorübergehend beeinträchtigen. Eine ununterbrochene Verfügbarkeit oder ein bestimmter gesundheitlicher Erfolg wird nicht zugesagt. Gesetzliche Rechte bei mangelhaften digitalen Leistungen und gesetzliche Aktualisierungspflichten bleiben bestehen. Die Haftung für Vorsatz, grobe Fahrlässigkeit und Schäden aus Verletzung von Leben, Körper oder Gesundheit sowie andere zwingende gesetzliche Haftung wird nicht beschränkt. Auch im Übrigen richten sich Ansprüche nach den gesetzlichen Vorschriften; die Hinweise zu Schätzungen sind kein pauschaler Haftungsausschluss."],
      ["9. Beendigung und Änderungen", "Du kannst die Nutzung jederzeit einstellen und die Löschung deines Kontos über Profil → Meine Daten → Konto löschen beantragen. Lade benötigte Daten vorher herunter. Gesetzlich erforderliche Aufbewahrung und Löschfristen richten sich nach der noch zu bestätigenden App-Datenschutzerklärung. Wesentliche Änderungen dieser Bedingungen müssen transparent mitgeteilt und, soweit erforderlich, wirksam vereinbart werden. Bloße Weiternutzung gilt nicht automatisch als Zustimmung; gesetzliche Rechte zur Beendigung bleiben unberührt."],
      ["10. Kontakt und Streitbeilegung", "Für Fragen zur App nutze den Kundenservice im Profil: service@fairvital.com oder +49 2234 2190482. Verbindliche Angaben zur Teilnahme des App-Betreibers an einer Verbraucherschlichtung müssen vor Freigabe ergänzt werden; die Erklärung des Shop-Verkäufers wird nicht ungeprüft auf die App übertragen. Die frühere EU-Plattform zur Online-Streitbeilegung wurde eingestellt und wird hier nicht als verfügbare Anlaufstelle verlinkt. Zwingende Verbraucherschutzvorschriften und gesetzliche Gerichtsstände bleiben unberührt."],
    ],
  },
  en: {
    date: "Updated: 9 October 2026",
    draft: "Draft for legal review. Adapted from the Fairvital shop terms for Vitalplus. Before binding use, the app operator and full provider details must be confirmed. Displaying this text alone does not establish an effective agreement.",
    sections: [
      ["1. Scope and provider", "These terms concern the Vitalplus health and nutrition app and its digital features. The linked shop terms identify Fairvital BV as the seller of goods; this does not automatically establish Fairvital BV as the contractual provider of the app. Binding Vitalplus provider details must be added before approval. The app is intended for adults for personal use. A consumer is an individual acting predominantly outside their trade or profession."],
      ["2. Registration and account", "Personalized features require an individual email and password account. Provide accurate information and keep credentials confidential. Use an accessible email address for confirmation, password recovery and account security. App and Fairvital shop accounts are separate. Opening these terms does not constitute acceptance; any legally required incorporation must be ensured separately."],
      ["3. Features and technical requirements", "Vitalplus supports recording body data, meals and lab values and displaying goals, trends and suggestions. It can be installed as a Progressive Web App. Internet access, a compatible device and, where applicable, camera, microphone or notification permission are required. Only previously available content is accessible offline; sign-in, synchronization and AI analysis require a connection. Apple Health and Health Connect provide measurements only through an actual integration with permission. Reminders currently work only while the app is open."],
      ["4. Health guidance and AI estimates", "Vitalplus does not replace medical examination, diagnosis, treatment or individual nutrition advice. Lab PDF and photo analysis, voice recognition and food-photo recognition may be inaccurate or incomplete. Calories, protein, vitamins, minerals and omega fats are estimates unless based on verified measurements or product data. Check extracted values against the original report and correct meal entries where necessary. References are not personal medical limits; low estimated daily intake does not prove a clinical deficiency. Do not change medication or supplements based solely on the app. Discuss abnormal results, pregnancy, pre-existing conditions and possible interactions with qualified professionals. For acute symptoms contact local emergency services."],
      ["5. Recommendations and Fairvital shop", "Product suggestions reflect profile details, logged meals and, where available, lab values. They are neither prescriptions nor guarantees of a particular effect. Vitalplus has no cart or checkout and does not sell products within the app. Product links lead to the separate Fairvital shop. Purchases there are governed exclusively by the terms agreed there, including prices, payment, delivery, withdrawal, warranty and vouchers. The app does not place orders or require purchases."],
      ["6. Costs and consumer rights", "The current app has no payment process for app use. Device and internet costs and separate shop purchases are unaffected. Any paid app offering requires a separate transparent agreement; these terms do not create a subscription. Statutory consumer rights, including applicable digital-product rights and statutory withdrawal rights, remain unaffected. The Fairvital shop withdrawal notice governs goods purchases."],
      ["7. Your content, privacy and security", "Upload only content you are entitled to use and avoid other people's reports or personal data. Illegal content, abusive access and bypassing security measures are prohibited. Health data is especially sensitive. The controller, processing purposes, AI providers, retention and data-subject rights must be described in a separate app privacy notice; these terms replace neither that notice nor any required consent. Under My data you can download stored information and initiate account deletion. App Lock is a device-level access gate, not a guarantee of encryption or comprehensive device protection."],
      ["8. Availability, updates and liability", "Maintenance, connectivity issues or external service outages may temporarily affect features. Uninterrupted availability or a particular health outcome is not guaranteed. Statutory rights for defective digital services and statutory update obligations remain in place. Liability for intent, gross negligence, injury to life, body or health and other mandatory statutory liability is not limited. Other claims also remain governed by law; estimation warnings are not a blanket liability exclusion."],
      ["9. Ending use and changes", "You may stop using the app at any time and request account deletion through Profile → My data → Delete account. Download any information you need beforehand. Legally required retention and deletion periods are governed by the app privacy notice, which remains to be confirmed. Material changes to these terms must be communicated transparently and effectively agreed where required. Continued use does not automatically constitute consent; statutory termination rights remain unaffected."],
      ["10. Contact and dispute resolution", "For app questions use customer service in Profile: service@fairvital.com or +49 2234 2190482. Binding information on the app operator's participation in consumer dispute resolution must be added before approval; the shop seller's declaration is not automatically transferred to the app. The former EU online dispute resolution platform has closed and is not linked here as an available service. Mandatory consumer protection and statutory jurisdictions remain unaffected."],
    ],
  },
  es: {
    date: "Actualizado: 9 de octubre de 2026",
    draft: "Borrador para revisión jurídica. Adaptado de las condiciones de la tienda Fairvital para Vitalplus. Antes de su uso vinculante deben confirmarse el operador de la app y los datos completos del proveedor. Mostrar este texto no constituye por sí solo un acuerdo válido.",
    sections: [
      ["1. Ámbito y proveedor", "Estas condiciones se refieren a la app de salud y nutrición Vitalplus y sus funciones digitales. Las condiciones de la tienda enlazada identifican a Fairvital BV como vendedor de productos; esto no demuestra automáticamente que sea el proveedor contractual de la app. Los datos vinculantes del proveedor de Vitalplus deben añadirse antes de la aprobación. La app está dirigida a adultos para uso personal. Un consumidor es una persona física que actúa principalmente fuera de su actividad comercial o profesional."],
      ["2. Registro y cuenta", "Las funciones personalizadas requieren una cuenta propia con correo electrónico y contraseña. Facilita información correcta y mantén tus credenciales confidenciales. Utiliza un correo accesible para la confirmación, la recuperación de contraseña y la seguridad. Las cuentas de la app y de la tienda Fairvital son independientes. Abrir este texto no supone aceptar las condiciones; cualquier incorporación legalmente necesaria debe garantizarse por separado."],
      ["3. Funciones y requisitos técnicos", "Vitalplus permite registrar datos corporales, comidas y valores de laboratorio, y mostrar objetivos, tendencias y sugerencias. Puede instalarse como aplicación web progresiva. Se necesita conexión a internet, un dispositivo compatible y, cuando corresponda, permisos de cámara, micrófono o notificaciones. Sin conexión solo está disponible el contenido previamente accesible; el inicio de sesión, la sincronización y el análisis con IA requieren conexión. Apple Health y Health Connect solo aportan mediciones mediante una integración real autorizada. Actualmente los recordatorios solo funcionan mientras la app está abierta."],
      ["4. Salud y estimaciones con IA", "Vitalplus no sustituye un examen médico, diagnóstico, tratamiento o asesoramiento nutricional individual. El análisis de informes y fotos, el reconocimiento de voz y de alimentos pueden ser incorrectos o incompletos. Calorías, proteínas, vitaminas, minerales y grasas omega son estimaciones salvo que procedan de mediciones o datos de productos verificados. Comprueba los valores frente al informe original y corrige las comidas cuando sea necesario. Las referencias no son límites médicos personales; una ingesta diaria estimada baja no demuestra una deficiencia clínica. No cambies medicamentos ni suplementos basándote solo en la app. Consulta con profesionales cualificados sobre resultados anormales, embarazo, enfermedades previas e interacciones. Ante síntomas agudos contacta con los servicios de emergencia locales."],
      ["5. Recomendaciones y tienda Fairvital", "Las sugerencias de productos se basan en el perfil, las comidas registradas y, cuando existen, los valores de laboratorio. No son prescripciones ni garantías de efectos concretos. Vitalplus no tiene carrito ni proceso de pago y no vende productos dentro de la app. Los enlaces llevan a la tienda independiente Fairvital. Las compras se rigen exclusivamente por las condiciones acordadas allí, incluidos precios, pago, entrega, desistimiento, garantía y cupones. La app no realiza pedidos ni obliga a comprar."],
      ["6. Costes y derechos del consumidor", "La app actual no dispone de un proceso de pago por su uso. Los costes del dispositivo, internet y las compras separadas en la tienda no se ven afectados. Cualquier oferta de pago de la app requiere un acuerdo independiente y transparente; estas condiciones no crean una suscripción. Se mantienen los derechos legales del consumidor, incluidos los aplicables a productos digitales y el desistimiento legal. Para compras de productos se aplica la información de desistimiento de la tienda Fairvital."],
      ["7. Contenido, privacidad y seguridad", "Sube solo contenido que tengas derecho a utilizar y evita informes o datos personales de otras personas. No se permiten contenidos ilegales, accesos abusivos ni eludir medidas de seguridad. Los datos de salud son especialmente sensibles. El responsable, las finalidades, los proveedores de IA, la conservación y los derechos deben describirse en una política de privacidad específica de la app; estas condiciones no sustituyen esa política ni los consentimientos necesarios. En Mis datos puedes descargar la información guardada e iniciar la eliminación de la cuenta. App Lock es un bloqueo de acceso del dispositivo, no una garantía de cifrado o protección integral."],
      ["8. Disponibilidad, actualizaciones y responsabilidad", "El mantenimiento, los problemas de conexión o fallos de servicios externos pueden afectar temporalmente a las funciones. No se garantiza disponibilidad ininterrumpida ni un resultado de salud concreto. Se mantienen los derechos legales por servicios digitales defectuosos y las obligaciones legales de actualización. No se limita la responsabilidad por dolo, negligencia grave, daños a la vida, integridad o salud ni otras responsabilidades legales imperativas. Las demás reclamaciones también se rigen por la ley; las advertencias sobre estimaciones no son una exclusión general de responsabilidad."],
      ["9. Finalización y cambios", "Puedes dejar de usar la app cuando quieras y solicitar la eliminación de tu cuenta en Perfil → Mis datos → Eliminar cuenta. Descarga antes los datos que necesites. Los plazos legales de conservación y eliminación se rigen por la política de privacidad de la app, pendiente de confirmación. Los cambios importantes deben comunicarse de forma transparente y acordarse válidamente cuando sea necesario. Continuar usando la app no supone automáticamente consentimiento; los derechos legales de resolución se mantienen."],
      ["10. Contacto y resolución de conflictos", "Para preguntas sobre la app utiliza el servicio de atención en Perfil: service@fairvital.com o +49 2234 2190482. Antes de la aprobación debe añadirse la información vinculante sobre la participación del operador en mecanismos de resolución de conflictos de consumo; la declaración del vendedor de la tienda no se traslada automáticamente a la app. La antigua plataforma europea de resolución de litigios en línea ha cerrado y no se enlaza como servicio disponible. Se mantienen las normas imperativas de protección del consumidor y los fueros legales."],
    ],
  },
};

export const Route = createFileRoute("/profil/$section")({
  head: ({ params }) => {
    const title = `${titles[params.section] ?? "Profil"} — Vitalplus`;
    const description = `Dein Vitalplus Profil: ${titles[params.section] ?? "Einstellungen"} verwalten.`;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: ProfileSubmenu,
});

function Row({ title, sub, icon: Icon, onClick, danger = false, green = false }: { title: string; sub?: string; icon: LucideIcon; onClick: () => void; danger?: boolean; green?: boolean }) {
  useLanguage();
  return <Button variant="ghost" onClick={onClick} className={`h-auto min-h-16 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left ${green ? "min-h-20 rounded-2xl bg-card" : "rounded-lg bg-card"} ${danger ? "text-destructive" : "text-foreground"}`}>
    <span className={`grid shrink-0 place-items-center rounded-full ${green ? "size-12 bg-fresh-soft text-fv-deep" : "size-9"}`}><Icon className={`${green ? "size-6!" : "size-5!"}`} strokeWidth={1.6} /></span>
    <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-5"><Localized>{title}</Localized></span>{sub && <span className={`block break-words text-[12px] font-normal leading-4 ${danger ? "text-destructive" : "text-muted-foreground"}`}><Localized>{sub}</Localized></span>}</span><ChevronRight className="size-4! shrink-0 text-muted-foreground" />
  </Button>;
}

function ProfileSubmenu() {
  const language = useLanguage();
  const terms = termsCopy[language];
  const { section } = Route.useParams();
  const navigate = Route.useNavigate();
  const { s, set } = useStore();
  const [detail, setDetail] = useState<{ title: string; text?: string; name?: boolean; data?: boolean; faq?: boolean; password?: boolean; lock?: boolean; target?: boolean; terms?: boolean } | null>(null);
  const [name, setName] = useState(s.name);
  const [targetWeight, setTargetWeight] = useState("");
  const [field, setField] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [draftGoals, setDraftGoals] = useState<string[]>([]);
  const openField = (f: Field, title: string) => {
    setField(f);
    if (f === "goals") setDraftGoals(s.goals);
    else if (f === "sex") setDraft(s.body.sex ?? "unspecified");
    else if (f === "activity") setDraft(s.body.activity ?? "");
    else setDraft(s.body[numFields[f].key]?.toString() ?? "");
    setDetail({ title });
  };
  const saveField = (e: FormEvent) => {
    e.preventDefault();
    if (!field) return;
    if (field === "goals") set({ goals: draftGoals });
    else if (field === "sex") set({ body: { ...s.body, sex: draft as NonNullable<typeof s.body.sex> } });
    else if (field === "activity") { if (!draft) return; set({ body: { ...s.body, activity: draft } }); }
    else {
      const cfg = numFields[field]; const n = Number(draft.replace(",", "."));
      if (!draft.trim() || isNaN(n) || n < cfg.min || n > cfg.max) return;
      set({ body: { ...s.body, [cfg.key]: field === "weight" ? Math.round(n * 10) / 10 : Math.round(n) } });
    }
    setDetail(null);
  };
  const notice = (title: string, text: string) => setDetail({ title, text });
  const deletion = () => navigate({ to: "/profil", search: { action: "delete" } });
  const download = () => {
    const { account: _account, ...health } = s;
    const url = URL.createObjectURL(new Blob([JSON.stringify(health, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "vivo-meine-daten.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const password = () => setDetail({ title: "Passwort ändern", password: true });
  const appLock = () => setDetail({ title: "App Lock", lock: true });
  const privacy = () => notice("Datenschutzerklärung", "Die offizielle Datenschutzerklärung für Vitalplus wurde noch nicht hinterlegt.");
  const value = (n: number | null | undefined, unit: string) => n == null ? "Nicht angegeben" : `${n} ${unit}`;
  return <AppShell>
    <header className="flex min-h-20 items-center gap-2 px-3 py-5">
      <Button variant="ghost" size="icon" asChild className="shrink-0"><Link to="/profil" aria-label={translateText("Zurück zum Profil")}><ArrowLeft className="size-5!" /></Link></Button>
      <h1 className="flex-1 text-center text-[17px] font-bold leading-6"><Localized>{titles[section] ?? "Profil"}</Localized></h1><span className="w-9" aria-hidden="true" />
    </header>
    <div className="space-y-4 px-4 pb-6">
      {section === "personal" && <div className="space-y-px overflow-hidden rounded-lg">
        <Row title={translateText("Name")} sub={translateText(s.name || "Nicht angegeben")} icon={UserRound} onClick={() => { setName(s.name); setDetail({ title: "Name", name: true }); }} />
        <Row title={translateText("Alter")} sub={translateText(value(s.body.age, "Jahre"))} icon={CalendarDays} onClick={() => openField("age", "Alter")} />
        <Row title={translateText("Geschlecht")} sub={translateText(({ female: "Weiblich", male: "Männlich", diverse: "Diverse", unspecified: "Keine Angabe" })[s.body.sex ?? "unspecified"])} icon={UsersRound} onClick={() => openField("sex", "Geschlecht")} />
        <Row title={translateText("Größe")} sub={translateText(value(s.body.heightCm, "cm"))} icon={Ruler} onClick={() => openField("height", "Größe")} />
        <Row title={translateText("Gewicht")} sub={translateText(value(s.body.weightKg, "kg"))} icon={Weight} onClick={() => openField("weight", "Gewicht")} />
        <Row title={translateText("Zielgewicht")} sub={translateText(s.body.targetWeightKg ? `${s.body.targetWeightKg} kg` : "Nicht angegeben")} icon={Weight} onClick={() => { setTargetWeight(s.body.targetWeightKg?.toString() ?? ""); setDetail({ title: "Zielgewicht", target: true }); }} />
        <Row title={translateText("Aktivitätslevel")} sub={translateText(activityLevels.find(a => a.value === s.body.activity)?.label ?? "Nicht angegeben")} icon={Activity} onClick={() => openField("activity", "Aktivitätslevel")} />
        <Row title={translateText("Gesundheitsziele")} sub={translateText(s.goals.join(", ") || "Nicht angegeben")} icon={Heart} onClick={() => openField("goals", "Gesundheitsziele")} />
      </div>}
      {(section === "security" || section === "account") && <>
        {section === "account" && <h2 className="eyebrow"><Localized>{"Vitalplus Konto"}</Localized></h2>}
        <div className="space-y-px overflow-hidden rounded-lg"><div className="flex min-h-16 w-full items-center gap-3 rounded-lg bg-card px-3 py-3 text-left text-foreground"><span className="grid size-9 shrink-0 place-items-center rounded-full"><Mail className="size-5!" strokeWidth={1.6} /></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-5"><Localized>{"E-Mail-Adresse"}</Localized></span><span className="block break-words text-[12px] font-normal leading-4 text-muted-foreground"><Localized>{s.account?.email ?? "Nicht angemeldet"}</Localized></span></span></div><Row title={translateText("Passwort ändern")} sub={translateText("Reset-Link per E-Mail")} icon={KeyRound} onClick={password} /><Row title={translateText("App Lock")} sub={translateText("Gerätecode oder Biometrie")} icon={Shield} onClick={appLock} />
        {section === "account" && <Row title={translateText("Verbundene Apps")} sub={translateText("Apple Health, Health Connect")} icon={LayoutGrid} onClick={() => notice("Verbundene Apps", "Apple Health und Google Health Connect sind noch nicht verbunden. In dieser Web-App ist kein direkter Zugriff verfügbar.")} />}</div>
        <Row title={translateText("Konto löschen")} icon={Trash2} danger onClick={deletion} />
      </>}
      {section === "settings" && <AppSettingsControls />}
      {section === "privacy" && <><div className="space-y-2">
        <Row title={translateText("Meine Daten herunterladen")} sub={translateText("Eine Kopie deiner Daten herunterladen")} icon={Download} green onClick={download} />
      </div><Row title={translateText("Konto löschen")} sub={translateText("Alle Daten und dein Konto dauerhaft löschen")} icon={Trash2} danger onClick={deletion} /></>}
      {section === "help" && <><p className="text-sm leading-5 text-muted-foreground"><Localized>{"Wir sind für dich da. Wähle eine Option, um uns zu kontaktieren."}</Localized></p><div className="space-y-2">
        <Row title={translateText("Anrufen")} sub={translateText("+49 2234 2190482")} icon={Phone} green onClick={() => { window.location.href = "tel:+4922342190482"; }} />
        <Row title={translateText("E-Mail")} sub={translateText("service@fairvital.com")} icon={Mail} green onClick={() => { window.location.href = "mailto:service@fairvital.com"; }} />
        <Row title={translateText("FAQ")} sub={translateText("Häufige Fragen und Antworten")} icon={CircleHelp} green onClick={() => setDetail({ title: "FAQ", faq: true })} />
        <Row title={translateText("Feedback geben")} sub={translateText("Hilf uns, die App zu verbessern")} icon={MessageSquare} green onClick={() => navigate({ to: "/profil/feedback" })} />
      </div></>}
      {section === "legal" && <div className="space-y-2">
        <Row title={translateText("Allgemeine Geschäftsbedingungen (AGB)")} icon={FileText} onClick={() => setDetail({ title: "Allgemeine Geschäftsbedingungen (AGB)", terms: true })} />
        <Row title={translateText("Datenschutzerklärung")} icon={Shield} onClick={privacy} />
        <Row title={translateText("Impressum")} icon={FileText} onClick={() => notice("Impressum", "Das offizielle Impressum für Vitalplus wurde noch nicht hinterlegt.")} />
        <Row title={translateText("Lizenzen")} sub={translateText("Open Source Lizenzen")} icon={FileText} onClick={() => notice("Lizenzen", "Vitalplus verwendet Open-Source-Software, darunter React, TanStack, Radix UI und Lucide. Eine vollständige Lizenzübersicht wurde noch nicht hinterlegt.")} />
      </div>}
      {!titles[section] && <p className="text-sm text-muted-foreground"><Localized>{"Dieser Profilbereich ist nicht verfügbar."}</Localized></p>}
    </div>
    <Dialog open={detail !== null} onOpenChange={open => { if (!open) { setDetail(null); setField(null); } }}><DialogContent aria-describedby={detail?.terms ? "vitalplus-terms-notice" : undefined} className={`max-h-[85dvh] overflow-y-auto rounded-2xl ${detail?.terms ? "max-w-2xl" : "max-w-sm"}`}><DialogHeader><DialogTitle><Localized>{detail?.title}</Localized></DialogTitle></DialogHeader>
      {detail?.terms && <article className="space-y-5 break-words text-sm leading-6">
        <p className="text-xs text-muted-foreground">{terms.date}</p>
        <p id="vitalplus-terms-notice" className="rounded-lg border border-border bg-muted p-3 text-muted-foreground">{terms.draft}</p>
        {terms.sections.map(([title, text]) => <section key={title}><h2 className="mb-2 font-semibold text-foreground">{title}</h2><p className="text-muted-foreground">{text}</p></section>)}
      </article>}
      {detail?.text && <p className="text-sm leading-6 text-muted-foreground"><Localized>{detail.text}</Localized></p>}
      {detail && field && <form className="space-y-4" onSubmit={saveField}>
        {(field === "age" || field === "height" || field === "weight") && <label className="block text-sm"><Localized>{numFields[field].label}</Localized><input autoFocus type="text" inputMode="decimal" className="mt-2 w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" value={draft} onChange={e => setDraft(e.target.value)} /></label>}
        {field === "sex" && <div className="grid grid-cols-2 gap-2">{sexOptions.map(([v, l]) => <button type="button" key={v} onClick={() => setDraft(v)} className={`rounded-full border px-3 py-2 text-sm ${draft === v ? "border-fresh bg-fresh text-ink" : "border-input bg-muted"}`}><Localized>{l}</Localized></button>)}</div>}
        {field === "activity" && <div className="space-y-2">{activityLevels.map(a => <button type="button" key={a.value} onClick={() => setDraft(a.value)} className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${draft === a.value ? "border-fresh bg-fresh text-ink" : "border-input bg-muted"}`}><Localized>{a.label}</Localized></button>)}</div>}
        {field === "goals" && <div className="flex flex-wrap gap-2">{goalOptions.map(g => { const on = draftGoals.includes(g); return <button type="button" key={g} aria-pressed={on} onClick={() => setDraftGoals(on ? draftGoals.filter(x => x !== g) : [...draftGoals, g])} className={`rounded-full border px-3 py-2 text-sm ${on ? "border-fresh bg-fresh text-ink" : "border-input bg-muted"}`}><Localized>{g}</Localized></button>; })}</div>}
        <Button type="submit" className="w-full bg-fresh text-ink hover:bg-fresh/90"><Localized>{"Speichern"}</Localized></Button>
      </form>}
      {detail?.password && <PasswordResetForm initialEmail={s.account?.email ?? ""} />}
      {detail?.lock && <AppLockSettings />}
      {detail?.name && <form className="space-y-4" onSubmit={e => { e.preventDefault(); set({ name: name.trim() }); setDetail(null); }}><label className="block text-sm"><Localized>{"Name"}</Localized><input className="mt-2 w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" value={name} onChange={e => setName(e.target.value)} /></label><Button type="submit" className="w-full bg-fresh text-ink hover:bg-fresh/90"><Localized>{"Speichern"}</Localized></Button></form>}
      {detail?.target && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const n = Number(targetWeight.replace(",", ".")); if (targetWeight.trim() && !isNaN(n) && n >= 30 && n <= 300) { set({ body: { ...s.body, targetWeightKg: Math.round(n * 10) / 10 } }); setDetail(null); } }}><label className="block text-sm"><Localized>{"Zielgewicht in kg"}</Localized><input type="text" inputMode="decimal" className="mt-2 w-full rounded-lg border border-input bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-ring" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} placeholder={translateText("z. B. 78")} /></label><Button type="submit" className="w-full bg-fresh text-ink hover:bg-fresh/90"><Localized>{"Speichern"}</Localized></Button>{s.body.targetWeightKg != null && <Button type="button" variant="ghost" className="w-full" onClick={() => { set({ body: { ...s.body, targetWeightKg: null } }); setDetail(null); }}><Localized>{"Zielgewicht entfernen"}</Localized></Button>}</form>}

      {detail?.data && <div className="space-y-4"><p className="text-sm text-muted-foreground"><Localized>{"Deine Werte, Mahlzeiten und Ziele sind deinem Konto zugeordnet."}</Localized></p><div className="flex items-center justify-between gap-3"><label htmlFor="profile-analytics" className="text-sm"><Localized>{"Anonyme Nutzungsstatistik"}</Localized></label><Switch id="profile-analytics" checked={s.consent.analytics} onCheckedChange={analytics => set({ consent: { ...s.consent, analytics } })} /></div><Button onClick={download} className="w-full bg-fresh text-ink hover:bg-fresh/90"><Download /><Localized>{" Daten herunterladen"}</Localized></Button></div>}
      {detail?.faq && <div className="space-y-4 text-sm"><details><summary className="cursor-pointer font-semibold"><Localized>{"Wie ändere ich Werte und Ziele?"}</Localized></summary><p className="mt-2 text-muted-foreground"><Localized>{"Unter Profil → Gesundheitsprofil bearbeiten öffnest du die passende Frage im Fragebogen."}</Localized></p></details><details><summary className="cursor-pointer font-semibold"><Localized>{"Wie lade ich einen neuen Befund hoch?"}</Localized></summary><p className="mt-2 text-muted-foreground"><Localized>{"Unter Labor kannst du alte Werte löschen und einen PDF-Befund oder ein Foto hochladen."}</Localized></p></details><details><summary className="cursor-pointer font-semibold"><Localized>{"Ich habe mein Passwort vergessen."}</Localized></summary><p className="mt-2 text-muted-foreground"><Localized>{"Auf der Anmeldeseite kannst du über „Passwort vergessen?“ einen neuen Link anfordern."}</Localized></p></details></div>}
    </DialogContent></Dialog>
  </AppShell>;
}
