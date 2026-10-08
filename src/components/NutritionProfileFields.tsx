import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { activityLevels, type NutritionProfile } from "@/lib/nutrition-targets";

export function NutritionProfileFields({ value, onChange }: { value: NutritionProfile; onChange: (value: NutritionProfile) => void }) {
  useLanguage();
  const field = "mt-1 w-full rounded-lg bg-card px-3 py-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring";
  return <div className="space-y-4">
    <label className="block text-sm"><Localized>{"Alter (Jahre)"}</Localized><input aria-label={translateText("Alter (Jahre)")} type="number" min={18} max={120} inputMode="numeric" value={value.age ?? ""} onChange={(e) => onChange({ ...value, age: e.target.value ? Number(e.target.value) : null })} className={field} /></label>
    <label className="block text-sm"><Localized>{"Geschlecht"}</Localized><select aria-label={translateText("Geschlecht")} value={value.sex ?? ""} onChange={(e) => onChange({ ...value, sex: e.target.value === "female" ? "female" : e.target.value === "male" ? "male" : e.target.value === "diverse" ? "diverse" : "unspecified" })} className={field}><option value="" disabled><Localized>{"Bitte wählen"}</Localized></option><option value="female"><Localized>{"Weiblich"}</Localized></option><option value="male"><Localized>{"Männlich"}</Localized></option><option value="diverse"><Localized>{"Diverse"}</Localized></option><option value="unspecified"><Localized>{"Keine Angabe"}</Localized></option></select></label>
    <label className="block text-sm"><Localized>{"Aktivität"}</Localized><select aria-label={translateText("Aktivität")} value={value.activity ?? ""} onChange={(e) => onChange({ ...value, activity: e.target.value })} className={field}><option value="" disabled><Localized>{"Bitte wählen"}</Localized></option>{activityLevels.map((a) => <option key={a.value} value={a.value}><Localized>{a.label}</Localized></option>)}</select></label>
  </div>;
}