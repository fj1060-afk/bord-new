import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens a meeting document through a short-lived signed URL. Both the table and
// storage policies must allow the signed-in user to read it.
export async function GET(_request: NextRequest, ctx: RouteContext<"/meetings/[meetingId]/documents/[documentId]">) {
  const { documentId } = await ctx.params;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("meeting_documents")
    .select("storage_path, file_name")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return new NextResponse("غير موجود", { status: 404 });

  const { data } = await supabase.storage
    .from("meeting-documents")
    .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
  if (!data?.signedUrl) return new NextResponse("تعذّر فتح الملف", { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
