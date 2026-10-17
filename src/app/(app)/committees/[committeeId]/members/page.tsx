import type { Metadata } from "next";
import { RegulationNote } from "@/components/ui/regulation-note";
import { NOTES } from "@/lib/regulations";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { COMMITTEE_POSITIONS, sortByPosition } from "@/lib/org";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { setCommitteeStatus } from "../../actions";
import { CommitteeForm } from "../../committee-forms";

export const metadata: Metadata = { title: "أعضاء اللجنة" };

type MemberRow = {
  id: string;
  position: keyof typeof COMMITTEE_POSITIONS;
  start_date: string;
  person: { id: string; full_name: string };
};

export default async function CommitteeMembersPage({ params }: PageProps<"/committees/[committeeId]/members">) {
  const viewer = await requirePage("/committees");
  const { committeeId } = await params;
  const canEdit = can(viewer.permissions, "/committees", LEVELS.edit);
  const canManage = can(viewer.permissions, "/committees", LEVELS.manage);
  const supabase = await createClient();

  const [{ data: committee }, { data: rows }] = await Promise.all([
    supabase.from("committees").select("id, name, mandate, kind, status").eq("id", committeeId).maybeSingle(),
    supabase
      .from("committee_members")
      .select("id, position, start_date, person:people(id, full_name)")
      .eq("committee_id", committeeId)
      .eq("status", "active"),
  ]);
  if (!committee) notFound();
  const members = sortByPosition(
    ((rows ?? []) as unknown as MemberRow[]).map((m) => ({ ...m, name: m.person.full_name })),
  );
  const archived = committee.status === "archived";

  return (
    <>
      <PageHeader section={committee.name} title="الأعضاء" />
      <RegulationNote notes={NOTES.committees} />
      {archived && <p className="mb-6 rounded-md bg-brass-soft px-4 py-3 text-sm text-brass">هذه اللجنة مؤرشفة.</p>}

      <section className="mb-8 rounded-lg border border-rule bg-surface p-5">
        <h2 className="mb-2 text-sm font-medium text-brass">المهام والاختصاصات</h2>
        <p className="whitespace-pre-line text-sm leading-7">{committee.mandate || "لم تُحدد بعد."}</p>
      </section>

      <h2 className="mb-3 font-display text-xl font-bold">الأعضاء</h2>
      {canEdit && !archived && (
        <div className="mb-4">
          <p className="rounded-md bg-paper px-4 py-3 text-sm text-ink-muted">
            أعضاء اللجنة ومناصبهم تُعدَّل من{" "}
            <Link href="/admin/users" className="font-medium text-primary hover:underline">
              المستخدمون والإدارات
            </Link>{" "}
            ← المستخدم ← تبويب «المنصب»، حتى لا تختلف بين الصفحات.
          </p>
        </div>
      )}
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
        {members.length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا يوجد أعضاء بعد.</li>}
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
            <Link href={`/people/${m.person.id}`} className="min-w-0 flex-1 font-medium text-primary hover:underline">
              {m.person.full_name}
            </Link>
            <span>{COMMITTEE_POSITIONS[m.position]}</span>
            <span className="text-ink-muted">منذ {formatGregorianDate(new Date(m.start_date))}</span>
          </li>
        ))}
      </ul>

      {canManage && (
        <details className="mt-8 rounded-lg border border-rule bg-surface">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium">تعديل اللجنة</summary>
          <div className="flex flex-col gap-6 border-t border-rule p-5">
            <CommitteeForm committee={committee} />
            <ConfirmButton
              action={setCommitteeStatus.bind(null, committee.id, archived ? "active" : "archived")}
              label={archived ? "إعادة تفعيل اللجنة" : "أرشفة اللجنة"}
                      variant={archived ? "secondary" : "danger"}
              confirm={archived ? "إعادة تفعيل اللجنة؟" : "أرشفة اللجنة؟ يبقى سجلها محفوظاً."}
            />
          </div>
        </details>
      )}
    </>
  );
}
