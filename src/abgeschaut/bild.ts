/** Zielmaß: längste Seite höchstens `max`, nie vergrößern. */
export function zielmass(breite: number, hoehe: number, max = 1200): [number, number] {
  const f = Math.min(1, max / Math.max(breite, hoehe));
  return [Math.round(breite * f), Math.round(hoehe * f)];
}

/**
 * Verkleinert ein Foto im Browser und kodiert es neu. Dabei fallen alle
 * Metadaten weg, auch EXIF mit dem Aufnahmeort: das Canvas kennt nur Pixel.
 * WebP, wo der Browser es schreiben kann, sonst JPEG.
 */
export async function verkleinere(datei: Blob, max = 1200): Promise<Blob> {
  const bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
  const [w, h] = zielmass(bild.width, bild.height, max);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bild, 0, 0, w, h);
  bild.close();
  const als = (typ: string, q: number) => new Promise<Blob | null>((ok) => c.toBlob(ok, typ, q));
  const webp = await als("image/webp", 0.82);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await als("image/jpeg", 0.85);
  if (!jpeg) throw new Error("Das Bild ließ sich nicht umrechnen.");
  return jpeg;
}

export const groesse = (bytes: number) =>
  bytes > 1e6 ? `${(bytes / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
