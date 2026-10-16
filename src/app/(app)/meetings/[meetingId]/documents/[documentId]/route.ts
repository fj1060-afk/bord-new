import { type NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { openStoredFile } from "@/lib/document-server";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

// Opens a meeting document the viewer can see (RLS on the row). Organizers and
// the uploader get the original; others may get a protected copy.
export async function GET(_request: NextRequest, ctx: RouteContext<"/meetings/[meetingId]/documents/[documentId]">) {
  const { documentId } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return new NextResponse("غير مصرح", { status: 401 });
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("meeting_documents")
    .select("storage_path, file_name, uploaded_by")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return new NextResponse("غير موجود", { status: 404 });
  const exempt = can(viewer.permissions, "/meetings", LEVELS.edit) || doc.uploaded_by === viewer.id;
  return openStoredFile(supabase, viewer, { bucket: "meeting-documents", path: doc.storage_path, name: doc.file_name }, exempt);
}
