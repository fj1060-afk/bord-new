// Stamps the reader's identity on every page of a PDF, so a leaked copy names
// its source. Standard PDF fonts have no Arabic, so the stamp is in Latin.

import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const isPdf = (fileName: string, bytes?: Uint8Array) =>
  bytes ? bytes.length > 4 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-" : /\.pdf$/i.test(fileName);

/** The stamp's text: who opened the file and when (Riyadh time). */
export function stampText(email: string, at: Date): string {
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(at);
  return `CONFIDENTIAL · ${email} · ${when}`;
}

/** The PDF with the stamp across each page and along its foot. Throws on encrypted or damaged files. */
export async function watermarkPdf(bytes: Uint8Array, text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(10, Math.min(width, height) / 28);
    const across = font.widthOfTextAtSize(text, size);
    // Diagonal through the page centre.
    const angle = Math.atan2(height, width);
    page.drawText(text, {
      x: width / 2 - (across / 2) * Math.cos(angle),
      y: height / 2 - (across / 2) * Math.sin(angle),
      size,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.25,
      rotate: degrees((angle * 180) / Math.PI),
    });
    page.drawText(text, { x: 24, y: 12, size: 7, font, color: rgb(0.45, 0.45, 0.45), opacity: 0.8 });
  }
  return pdf.save();
}

/** Content-Disposition for a file name in any script. */
export function disposition(fileName: string, inline: boolean): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
