import type { Metadata } from "next";
import { RegulationNote } from "@/components/ui/regulation-note";
import { NOTES } from "@/lib/regulations";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/styles";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CommitteeForm } from "./committee-forms";

export const metadata: Metadata = { title: "اللجان" };

type Row = {
  id: string;
  name: string;
  status: "active" | "archived";
  committee_members: { position: string; status: string; person: { full_name: string } }[];
};

export default async function CommitteesPage() {
  const viewer = await requirePage("/committees");
  const supabase = await createClient();
  const { data } = await supabase
    .from("committees")
    .select("id, name, status, committee_members(position, status, person:people(full_name))")
    .order("status")
    .order("name");
  const committees = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader section="الحوكمة" title="اللجان" description="لجان المجلس وأعضاؤها." />
      <RegulationNote notes={NOTES.committees} />

      {can(viewer.permissions, "/committees", LEVELS.manage) && (
        <details className="mb-6 rounded-lg border border-rule bg-surface">
          <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>لجنة جديدة</summary>
          <div className="border-t border-rule p-5">
            <CommitteeForm />
          </div>
        </details>
      )}

      {committees.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-ink-muted">
          لا توجد لجان بعد.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {committees.map((c) => {
            const active = c.committee_members.filter((m) => m.status === "active");
            const chair = active.find((m) => m.position === "chair");
            return (
              <li key={c.id}>
                <Link
                  href={`/committees/${c.id}`}
                  className="block rounded-lg border border-rule bg-surface p-5 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold">{c.name}</h2>
                    {c.status === "archived" && (
                      <span className="rounded-full border border-rule px-2.5 py-0.5 text-xs text-ink-muted">مؤرشفة</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {chair ? `الرئيس: ${chair.person.full_name}` : "بدون رئيس"} · <span className="font-mono">{active.length}</span> أعضاء
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
