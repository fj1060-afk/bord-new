import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens a library document through a short-lived signed URL (table and storage RLS apply).
export async function GET(_request: NextRequest, ctx: RouteContext<"/documents/library/[documentId]">) {
  const { documentId } = await ctx.params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("library_documents").select("storage_path, file_name").eq("id", documentId).maybeSingle();
  if (!doc) return new NextResponse("غير موجود", { status: 404 });
  const { data } = await supabase.storage.from("library").createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
  if (!data?.signedUrl) return new NextResponse("تعذّر فتح الملف", { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
