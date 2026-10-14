import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens a task's evidence file through a short-lived signed URL (table and storage RLS apply).
export async function GET(_request: NextRequest, ctx: RouteContext<"/my-tasks/evidence/[updateId]">) {
  const { updateId } = await ctx.params;
  const supabase = await createClient();
  const { data: update } = await supabase.from("task_updates").select("evidence_path, file_name").eq("id", updateId).maybeSingle();
  if (!update?.evidence_path) return new NextResponse("غير موجود", { status: 404 });
  const { data } = await supabase.storage
    .from("task-evidence")
    .createSignedUrl(update.evidence_path, 60, { download: update.file_name ?? true });
  if (!data?.signedUrl) return new NextResponse("تعذّر فتح الملف", { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
