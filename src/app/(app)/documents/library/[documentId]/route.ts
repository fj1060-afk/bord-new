import { type NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { openStoredFile } from "@/lib/document-server";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

// Opens a library document (table RLS applies). Library editors get the original; others may get a protected copy.
export async function GET(_request: NextRequest, ctx: RouteContext<"/documents/library/[documentId]">) {
  const { documentId } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return new NextResponse("غير مصرح", { status: 401 });
  const supabase = await createClient();
  const { data: doc } = await supabase.from("library_documents").select("storage_path, file_name").eq("id", documentId).maybeSingle();
  if (!doc) return new NextResponse("غير موجود", { status: 404 });
  const exempt = can(viewer.permissions, "/documents", LEVELS.edit);
  return openStoredFile(supabase, viewer, { bucket: "library", path: doc.storage_path, name: doc.file_name }, exempt);
}
