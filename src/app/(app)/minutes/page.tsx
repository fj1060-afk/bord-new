import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { meetingReference } from "@/lib/meetings";
import { MINUTES_STATUS, type MinutesStatus } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "المحاضر" };

type Row = {
  id: string;
  status: MinutesStatus;
  version: number;
  meeting: { id: string; title: string; number: number | null; code: string | null; starts_at: string; board: { name: string } | null; committee: { name: string } | null };
};

export default async function MinutesPage() {
  const viewer = await requirePage("/minutes");
  const supabase = await createClient();
  const { data } = await supabase
    .from("minutes")
    .select("id, status, version, meeting:meetings(id, title, number, code, starts_at, board:boards(name), committee:committees(name))")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  // Minutes waiting for the viewer's own signature come first.
  const pending = new Set<string>();
  if (viewer.personId) {
    for (const m of rows.filter((r) => r.status === "review")) {
      const [{ data: signers }, { data: signed }] = await Promise.all([
        supabase.rpc("minutes_signers", { p_minutes: m.id }),
        supabase.from("minutes_signatures").select("person_id").eq("minutes_id", m.id).eq("version", m.version).eq("person_id", viewer.personId),
      ]);
      if ((signers ?? []).some((s: { person_id: string }) => s.person_id === viewer.personId) && !(signed ?? []).length) pending.add(m.id);
    }
  }
  const sorted = [...rows].sort((a, b) => Number(pending.has(b.id)) - Number(pending.has(a.id)));

  return (
    <>
      <PageHeader section="الحوكمة" title="المحاضر" description="محاضر الاجتماعات وحالة توقيعها." />
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
        {sorted.length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا توجد محاضر بعد.</li>}
        {sorted.map((m) => (
          <li key={m.id}>
            <Link href={`/meetings/${m.meeting.id}?tab=minutes`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-paper">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.meeting.title}</span>
                <span className="block text-xs text-ink-muted">
                  {(m.meeting.board ?? m.meeting.committee)?.name} · {meetingReference(m.meeting.code)} · {formatGregorianDate(new Date(m.meeting.starts_at))}
                </span>
              </span>
              {pending.has(m.id) && <span className="rounded-full bg-brass px-2.5 py-0.5 text-xs text-white">بانتظار توقيعك</span>}
              <span className={clsx("rounded-full px-2.5 py-0.5 text-xs", m.status === "approved" ? "bg-primary-soft text-primary" : m.status === "review" ? "bg-brass-soft text-brass" : "border border-rule text-ink-muted")}>
                {MINUTES_STATUS[m.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
