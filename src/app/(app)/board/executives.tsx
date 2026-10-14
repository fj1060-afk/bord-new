import Link from "next/link";
import { ConfirmButton } from "@/components/org/confirm-button";
import { createClient } from "@/lib/supabase/server";
import { removeExecutive } from "./actions";
import { AddExecutiveForm } from "./board-forms";

/** Executive management: listed with this year's disclosure, as the secretary guide's register requires. */
export async function Executives({ year, canEdit, people }: { year: number; canEdit: boolean; people: { id: string; full_name: string }[] }) {
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("id, full_name, executive_title, disclosures(year)").not("executive_title", "is", null).order("full_name");
  const rows = (data ?? []) as { id: string; full_name: string; executive_title: string; disclosures: { year: number }[] }[];
  return (
    <section className="mt-8 rounded-lg border border-rule bg-surface">
      <h2 className="border-b border-rule px-5 py-3 font-display text-lg font-bold">الإدارة التنفيذية</h2>
      <ul className="divide-y divide-rule text-sm">
        {rows.length === 0 && <li className="p-5 text-center text-ink-muted">لم تُسجّل الإدارة التنفيذية بعد.</li>}
        {rows.map((r) => {
          const filed = r.disclosures.some((d) => d.year === year);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <Link href={`/people/${r.id}`} className="min-w-0 flex-1 font-medium text-primary hover:underline">
                {r.full_name}
                <span className="block text-xs font-normal text-ink-muted">{r.executive_title}</span>
              </Link>
              <span className={filed ? "text-primary" : "text-brass"}>{filed ? `أفصح ${year}` : `لم يُفصح ${year}`}</span>
              {canEdit && <ConfirmButton action={removeExecutive.bind(null, r.id)} label="إزالة" confirm={`إزالة ${r.full_name} من الإدارة التنفيذية؟`} />}
            </li>
          );
        })}
      </ul>
      {canEdit && <AddExecutiveForm people={people} />}
    </section>
  );
}
