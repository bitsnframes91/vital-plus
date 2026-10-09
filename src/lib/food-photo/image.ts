export async function prepareFoodPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || !file.size || file.size > 20_000_000) throw new Error("Bitte wähle ein Foto bis 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Das Foto konnte nicht geöffnet werden.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Das Foto konnte nicht geöffnet werden.")), "image/jpeg", 0.85));
  } finally { bitmap.close(); }
}