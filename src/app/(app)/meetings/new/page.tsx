import type { Metadata } from "next";
import { RegulationNote } from "@/components/ui/regulation-note";
import { NOTES } from "@/lib/regulations";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { serviceSettings } from "@/lib/ai-server";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { MeetingDetailsForm } from "../_components/meeting-forms";

export const metadata: Metadata = { title: "اجتماع جديد" };

/** `?body=board:<id>` or `committee:<id>` (from that body's pages) keeps only that body. */
const only = (bodies: { id: string; name: string; kind: string }[], body?: string) => {
  const match = bodies.filter((b) => `${b.kind}:${b.id}` === body);
  return match.length ? match : bodies;
};

export default async function NewMeetingPage({ searchParams }: PageProps<"/meetings/new">) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { body } = (await searchParams) as { body?: string };
  const [{ data: bodies }, services] = await Promise.all([supabase.rpc("list_meeting_bodies"), serviceSettings(supabase)]);

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
          <MeetingDetailsForm bodies={only(bodies as { id: string; name: string; kind: string }[], body)} allowRemote={services.remote_meetings} />
        </div>
      )}
    </>
  );
}
