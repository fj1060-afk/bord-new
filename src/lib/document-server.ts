import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceSettings } from "./ai-server";
import type { Viewer } from "./auth";
import { adminConfigured, createAdminClient } from "./supabase/admin";
import { disposition, isPdf, stampText, watermarkPdf } from "./watermark";

type File = { bucket: "meeting-documents" | "library"; path: string; name: string };

const refuse = (message: string, status = 403) =>
  new NextResponse(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:system-ui;padding:2rem;line-height:1.8">${message}</body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });

/**
 * Opens a stored file the caller already found through RLS. Readers the
 * company protects (`exempt` false while watermarking or view-only is on)
 * get the PDF through this server only: stamped with their email and time,
 * shown in the browser rather than downloaded; other formats are withheld.
 * Storage policies keep them from reading the original directly.
 */
export async function openStoredFile(supabase: SupabaseClient, viewer: Viewer, file: File, exempt: boolean): Promise<NextResponse> {
  const settings = await serviceSettings(supabase);
  const protect = !exempt && (settings.watermark_documents || settings.documents_view_only);
  if (!protect) {
    const { data } = await supabase.storage.from(file.bucket).createSignedUrl(file.path, 60, { download: file.name });
    if (!data?.signedUrl) return refuse("تعذّر فتح الملف.");
    return NextResponse.redirect(data.signedUrl);
  }
  if (!isPdf(file.name)) return refuse("هذا المستند متاح بصيغة PDF فقط ضمن حماية المستندات. اطلب من أمين السر نسخة PDF منه.");
  if (!adminConfigured()) return refuse("حماية المستندات مفعّلة ولم يُهيأ الخادم لها بعد. تواصل مع مسؤول النظام.", 503);

  // The caller passed RLS on the document row; the original is read with the secret key, then stamped.
  const { data: blob } = await createAdminClient().storage.from(file.bucket).download(file.path);
  if (!blob) return refuse("تعذّر فتح الملف.");
  let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  if (!isPdf(file.name, bytes)) return refuse("الملف ليس PDF صالحاً.");
  if (settings.watermark_documents) {
    try {
      bytes = await watermarkPdf(bytes, stampText(viewer.email, new Date()));
    } catch {
      return refuse("تعذّرت إضافة العلامة المائية (قد يكون الملف محمياً بكلمة مرور). اطلب من أمين السر نسخة غير محمية.");
    }
  }
  const out = bytes;
  const chunk = 1 << 20;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < out.length; i += chunk) controller.enqueue(out.subarray(i, i + chunk));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": disposition(file.name, settings.documents_view_only),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
