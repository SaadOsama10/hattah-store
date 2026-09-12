const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.8;
// Above this, even compression can't reliably help in a reasonable time —
// reject early with a clear message instead of hanging the browser.
const MAX_ORIGINAL_FILE_BYTES = 20 * 1024 * 1024;

export class ImageTooLargeError extends Error {
  constructor(public fileName: string) {
    super(`Image "${fileName}" exceeds the maximum allowed size`);
    this.name = "ImageTooLargeError";
  }
}

/** Resizes an image to at most 2000px on its longest side and re-encodes it
 * as JPEG at ~80% quality, entirely client-side (Canvas API, no dependency).
 * Keeps large phone-camera photos from tripping the server action body-size
 * limit before they ever leave the browser. */
export async function compressImageFile(file: File): Promise<File> {
  if (file.size > MAX_ORIGINAL_FILE_BYTES) {
    throw new ImageTooLargeError(file.name);
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
