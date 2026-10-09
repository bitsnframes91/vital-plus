import { z } from "zod";

export const foodPhotoOutput = z.object({
  foodVisible: z.boolean(), name: z.string(), kcal: z.number(), protein: z.number(),
  fiber: z.number(), carbs: z.number(), fat: z.number(),
});

export function normalizeFoodPhoto(value: unknown) {
  const result = foodPhotoOutput.safeParse(value);
  if (!result.success || !result.data.foodVisible || !result.data.name.trim()) return null;
  const { name, kcal, protein, fiber, carbs, fat } = result.data;
  if ([kcal, protein, fiber, carbs, fat].some(n => !Number.isFinite(n) || n < 0)) return null;
  return { name: name.trim().slice(0, 200), kcal: Math.round(kcal), protein: Math.round(protein), fiber: Math.round(fiber), carbs: Math.round(carbs), fat: Math.round(fat) };
}