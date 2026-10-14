import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { RESOLUTION_STATUS, isOverdue, resolutionReference, riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "القرارات" };

type Row = {
  id: string;
  number: number | null;
  year: number | null;
  text: string;
  status: keyof typeof RESOLUTION_STATUS;
  meeting: null | { id: string; title: string; starts_at: string; board: { name: string } | null; committee: { name: string } | null };
  resolution_tasks: { status: string; due_date: string | null }[];
};

export default async function ResolutionsPage({ searchParams }: PageProps<"/resolutions">) {
  await requirePage("/resolutions");
  const { status = "" } = (await searchParams) as { status?: string };
  const supabase = await createClient();
  let query = supabase
    .from("resolutions")
    .select("id, number, year, text, status, meeting:meetings(id, title, starts_at, board:boards(name), committee:committees(name)), resolution_tasks(status, due_date)")
    .order("created_at", { ascending: false });
  if (status in RESOLUTION_STATUS) query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const today = riyadhToday();

  return (
    <>
      <PageHeader section="الحوكمة" title="سجل القرارات" description="قرارات المجلس واللجان ومتابعة تنفيذ المهام المترتبة عليها." />
      <Link href="/resolutions/circular" className="mb-4 inline-block text-sm text-primary hover:underline">
        القرارات بالتمرير ←
      </Link>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="تصفية حسب الحالة">
        {[["", "الكل"], ...Object.entries(RESOLUTION_STATUS)].map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/resolutions?status=${value}` : "/resolutions"}
            className={clsx("rounded-full px-4 py-1.5", status === value ? "bg-primary text-on-primary" : "border border-rule bg-surface hover:bg-primary-soft")}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ul className="flex flex-col gap-3">
        {rows.length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا توجد قرارات.</li>}
        {rows.map((r) => {
          const tasks = r.resolution_tasks.filter((t) => t.status !== "cancelled");
          const done = tasks.filter((t) => t.status === "done").length;
          const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status, today)).length;
          return (
            <li key={r.id}>
              <Link href={`/resolutions/${r.id}`} className="block rounded-lg border border-rule bg-surface p-5 hover:border-primary">
                <div className="mb-1 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono font-bold text-brass">قرار {resolutionReference(r.number, r.year)}</span>
                  {r.meeting && <span className="text-ink-muted">{(r.meeting.board ?? r.meeting.committee)?.name} · {r.meeting.title}</span>}
                  <span className="ms-auto">{RESOLUTION_STATUS[r.status]}</span>
                </div>
                <p className="line-clamp-2">{r.text}</p>
                {tasks.length > 0 && (
                  <p className="mt-2 text-xs text-ink-muted">
                    المهام: <span className="font-mono">{done}</span> منجزة من <span className="font-mono">{tasks.length}</span>
                    {overdue > 0 && <span className="text-danger"> · {overdue} متأخرة</span>}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
