import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { disposition, isPdf, stampText, watermarkPdf } from "./watermark";

describe("watermark", () => {
  it("stamps every page and keeps the page count", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([842, 595]);
    const bytes = await doc.save();
    const out = await watermarkPdf(bytes, stampText("member@example.com", new Date("2026-10-16T09:00:00Z")));
    expect(isPdf("x", out)).toBe(true);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
    expect(out.length).toBeGreaterThan(bytes.length);
  });

  it("names the reader and the Riyadh time", () => {
    expect(stampText("a@b.co", new Date("2026-10-16T09:00:00Z"))).toBe("CONFIDENTIAL · a@b.co · 16 Oct 2026, 12:00");
  });

  it("refuses what is not a PDF", async () => {
    expect(isPdf("report.docx", new TextEncoder().encode("PK\x03\x04"))).toBe(false);
    await expect(watermarkPdf(new TextEncoder().encode("not a pdf"), "x")).rejects.toThrow();
  });

  it("keeps Arabic file names", () => {
    expect(disposition("تقرير.pdf", true)).toBe(`inline; filename="_____.pdf"; filename*=UTF-8''${encodeURIComponent("تقرير.pdf")}`);
  });
});
