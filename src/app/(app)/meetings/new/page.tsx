import type { Metadata } from "next";
import { RegulationNote } from "@/components/ui/regulation-note";
import { NOTES } from "@/lib/regulations";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { MeetingDetailsForm } from "../_components/meeting-forms";

export const metadata: Metadata = { title: "اجتماع جديد" };

export default async function NewMeetingPage() {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { data: bodies } = await supabase.rpc("list_meeting_bodies");

  return (
    <>
      <PageHeader
        section="الاجتماعات"
        title="اجتماع جديد"
        description="يُنشأ الاجتماع مسودةً ويُدعى إليه أعضاء الجهة تلقائياً. أضف الأجندة والمستندات، ثم اعتمد الموعد لتصل الدعوة للأعضاء."
      />
      <RegulationNote notes={[...NOTES.meetings, ...NOTES.quorum]} />
      {(bodies ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-ink-muted">
          أنشئ المجلس أو لجنة أولاً.
        </p>
      ) : (
        <div className="rounded-lg border border-rule bg-surface p-6">
          <MeetingDetailsForm bodies={bodies as { id: string; name: string; kind: string }[]} />
        </div>
      )}
    </>
  );
}
