import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { getViewer } from "@/lib/auth";
import { formatDateTime, formatGregorianDate } from "@/lib/format";
import { BOARD_POSITIONS, COMMITTEE_POSITIONS, currentYear } from "@/lib/org";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { reviewDisclosure } from "./actions";
import { DisclosureForm, PersonForm, type PersonDetails } from "./person-forms";

export const metadata: Metadata = { title: "ملف العضو" };

type Membership = { id: string; position: string; start_date: string; end_date: string | null; status: string };

export default async function PersonPage({ params }: PageProps<"/people/[personId]">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { personId } = await params;
  const supabase = await createClient();

  // RLS returns the person only to themself or to people who can see members.
  const { data: person } = await supabase
    .from("people")
    .select("id, full_name, email, phone, job_title, organization, qualifications, experience, user_id")
    .eq("id", personId)
    .maybeSingle<PersonDetails>();
  if (!person) notFound();

  const isSelf = person.user_id === viewer.id;
  const canEditPerson = can(viewer.permissions, "/board", LEVELS.edit) || can(viewer.permissions, "/committees", LEVELS.edit);
  const canReview = can(viewer.permissions, "/board", LEVELS.edit);
  const year = currentYear();

  const [{ data: board }, { data: committees }, { data: disclosures }, { data: users }] = await Promise.all([
    supabase.from("board_members").select("id, position, start_date, end_date, status, board:boards(name)").eq("person_id", personId).order("start_date", { ascending: false }),
    supabase.from("committee_members").select("id, position, start_date, end_date, status, committee:committees(id, name)").eq("person_id", personId).order("start_date", { ascending: false }),
    supabase.from("disclosures").select("id, year, has_conflict, details, status, submitted_at").eq("person_id", personId).order("year", { ascending: false }),
    canEditPerson ? supabase.rpc("list_active_users") : Promise.resolve({ data: [] }),
  ]);
  const filedThisYear = (disclosures ?? []).some((d) => d.year === year);

  const memberships = [
    ...((board ?? []) as unknown as (Membership & { board: { name: string } })[]).map((m) => ({
      ...m, body: m.board.name, href: "/board", label: BOARD_POSITIONS[m.position as keyof typeof BOARD_POSITIONS],
    })),
    ...((committees ?? []) as unknown as (Membership & { committee: { id: string; name: string } })[]).map((m) => ({
      ...m, body: m.committee.name, href: `/committees/${m.committee.id}`, label: COMMITTEE_POSITIONS[m.position as keyof typeof COMMITTEE_POSITIONS],
    })),
  ];

  return (
    <>
      <PageHeader section={isSelf ? "ملفي" : "ملف العضو"} title={person.full_name} description={[person.job_title, person.organization].filter(Boolean).join(" · ") || undefined} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">العضويات</h2>
            <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
              {memberships.length === 0 && <li className="p-6 text-center text-sm text-ink-muted">لا توجد عضويات.</li>}
              {memberships.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <Link href={m.href} className="min-w-0 flex-1 font-medium text-primary hover:underline">{m.body}</Link>
                  <span>{m.label}</span>
                  <span className="text-ink-muted">
                    {formatGregorianDate(new Date(m.start_date))}
                    {m.end_date && ` ← ${formatGregorianDate(new Date(m.end_date))}`}
                  </span>
                  {m.status === "ended" && <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-muted">منتهية</span>}
                </li>
              ))}
            </ul>
          </section>

          {canEditPerson ? (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">البيانات</h2>
              <div className="rounded-lg border border-rule bg-surface p-5">
                <PersonForm person={person} users={users ?? []} />
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-rule bg-surface p-5 text-sm leading-7">
              <h2 className="mb-2 font-display text-xl font-bold">البيانات</h2>
              {person.qualifications && <p><span className="text-ink-muted">المؤهلات: </span>{person.qualifications}</p>}
              {person.experience && <p><span className="text-ink-muted">الخبرات: </span>{person.experience}</p>}
              {!person.qualifications && !person.experience && <p className="text-ink-muted">لا توجد بيانات إضافية.</p>}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-bold">الإفصاحات السنوية</h2>
          {!filedThisYear && (isSelf || canReview) && <DisclosureForm personId={person.id} year={year} />}
          {(disclosures ?? []).length === 0 && !(isSelf || canReview) && (
            <p className="text-sm text-ink-muted">لا تظهر الإفصاحات إلا للعضو وللمخوّلين بمراجعتها.</p>
          )}
          <ul className="flex flex-col gap-3">
            {(disclosures ?? []).map((d) => (
              <li key={d.id} className="rounded-lg border border-rule bg-surface p-4 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono font-medium">{d.year}</span>
                  <span className={d.status === "reviewed" ? "text-xs text-primary" : "text-xs text-brass"}>
                    {d.status === "reviewed" ? "تمت المراجعة" : "بانتظار المراجعة"}
                  </span>
                </div>
                <p className={d.has_conflict ? "text-danger" : ""}>{d.has_conflict ? "يوجد تعارض مصالح" : "لا يوجد تعارض مصالح"}</p>
                {d.details && <p className="mt-1 whitespace-pre-line text-ink-muted">{d.details}</p>}
                <p className="mt-2 text-xs text-ink-muted">قُدّم {formatDateTime(new Date(d.submitted_at))}</p>
                {canReview && d.status !== "reviewed" && (
                  <div className="mt-3">
                    <ConfirmButton action={reviewDisclosure.bind(null, person.id, d.id)} label="اعتماد المراجعة" variant="secondary" confirm="اعتماد مراجعة هذا الإفصاح؟" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
