import { activityLevels, type NutritionProfile } from "@/lib/nutrition-targets";

export function NutritionProfileFields({ value, onChange }: { value: NutritionProfile; onChange: (value: NutritionProfile) => void }) {
  const field = "mt-1 w-full rounded-lg bg-card px-3 py-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring";
  return <div className="space-y-4">
    <label className="block text-sm">Alter (Jahre)<input aria-label="Alter (Jahre)" type="number" min={18} max={120} inputMode="numeric" value={value.age ?? ""} onChange={(e) => onChange({ ...value, age: e.target.value ? Number(e.target.value) : null })} className={field} /></label>
    <label className="block text-sm">Geschlecht<select aria-label="Geschlecht" value={value.sex ?? ""} onChange={(e) => onChange({ ...value, sex: e.target.value === "female" ? "female" : e.target.value === "male" ? "male" : e.target.value === "diverse" ? "diverse" : "unspecified" })} className={field}><option value="" disabled>Bitte wählen</option><option value="female">Weiblich</option><option value="male">Männlich</option><option value="diverse">Diverse</option><option value="unspecified">Keine Angabe</option></select></label>
    <label className="block text-sm">Aktivität<select aria-label="Aktivität" value={value.activity ?? ""} onChange={(e) => onChange({ ...value, activity: e.target.value })} className={field}><option value="" disabled>Bitte wählen</option>{activityLevels.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
  </div>;
}