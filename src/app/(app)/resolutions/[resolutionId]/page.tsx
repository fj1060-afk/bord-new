import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/styles";
import { requirePage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { RESOLUTION_STATUS, TASK_STATUS, isOverdue, resolutionReference, riyadhToday, type TaskStatus } from "@/lib/minutes";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cancelTask } from "../actions";
import { AddTaskForm } from "../task-forms";

export const metadata: Metadata = { title: "القرار" };

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  assignee: { full_name: string; email: string } | null;
  department: { name: string } | null;
  task_updates: { id: string; note: string | null; status: string | null; file_name: string | null; evidence_path: string | null; created_at: string }[];
};

export default async function ResolutionPage({ params }: PageProps<"/resolutions/[resolutionId]">) {
  const viewer = await requirePage("/resolutions");
  const { resolutionId } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("resolutions")
    .select("id, number, year, text, status, votes_for, votes_against, votes_abstain, meeting:meetings(id, title, starts_at)")
    .eq("id", resolutionId)
    .maybeSingle();
  if (!r) notFound();
  const meeting = r.meeting as unknown as { id: string; title: string; starts_at: string } | null;
  const manager = can(viewer.permissions, "/meetings", LEVELS.edit) || can(viewer.permissions, "/resolutions", LEVELS.edit);

  const [{ data: taskRows }, { data: users }, { data: departments }] = await Promise.all([
    supabase
      .from("resolution_tasks")
      .select("id, title, description, due_date, status, assignee:profiles(full_name, email), department:departments(name), task_updates(id, note, status, file_name, evidence_path, created_at)")
      .eq("resolution_id", resolutionId)
      .order("created_at"),
    manager ? supabase.rpc("list_active_users") : Promise.resolve({ data: [] }),
    manager ? supabase.from("departments").select("id, name").eq("status", "active").order("name") : Promise.resolve({ data: [] }),
  ]);
  const tasks = (taskRows ?? []) as unknown as Task[];
  const today = riyadhToday();

  return (
    <>
      <PageHeader
        section={`قرار ${resolutionReference(r.number, r.year)} · ${RESOLUTION_STATUS[r.status as keyof typeof RESOLUTION_STATUS]}`}
        title={meeting?.title ?? "القرار"}
        actions={
          meeting && (
            <Link href={`/meetings/${meeting.id}?tab=minutes`} className={buttonClass("secondary")}>
              المحضر
            </Link>
          )
        }
      />
      <section className="mb-8 rounded-lg border-s-4 border-brass bg-surface p-6 leading-8">
        <p className="whitespace-pre-line">{r.text}</p>
        {r.votes_for !== null && (
          <p className="mt-3 text-sm text-ink-muted">
            موافق <span className="font-mono">{r.votes_for}</span> · معارض <span className="font-mono">{r.votes_against ?? 0}</span> · ممتنع <span className="font-mono">{r.votes_abstain ?? 0}</span>
          </p>
        )}
      </section>

      <h2 className="mb-3 font-display text-xl font-bold">المهام المترتبة على القرار</h2>
      {manager && (
        <div className="mb-4">
          <AddTaskForm resolutionId={r.id} users={(users ?? []) as { id: string; full_name: string; email: string }[]} departments={departments ?? []} />
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {tasks.length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-6 text-center text-sm text-ink-muted">لا توجد مهام.</li>}
        {tasks.map((t) => (
          <li key={t.id} className="rounded-lg border border-rule bg-surface p-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 font-medium">{t.title}</span>
              <span className="text-ink-muted">{t.assignee?.full_name || t.assignee?.email || t.department?.name}</span>
              {t.due_date && <span className={isOverdue(t.due_date, t.status, today) ? "text-danger" : "text-ink-muted"}>حتى {t.due_date}</span>}
              <span className={t.status === "done" ? "text-primary" : "text-brass"}>{TASK_STATUS[t.status]}</span>
              {manager && t.status !== "done" && t.status !== "cancelled" && (
                <ConfirmButton action={cancelTask.bind(null, t.id)} label="إلغاء" confirm={`إلغاء المهمة "${t.title}"؟`} />
              )}
            </div>
            {t.description && <p className="mt-2 whitespace-pre-line text-ink-muted">{t.description}</p>}
            {t.task_updates.length > 0 && (
              <ol className="mt-3 flex flex-col gap-2 border-t border-rule pt-3">
                {[...t.task_updates].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((u) => (
                  <li key={u.id} className="text-xs">
                    <span className="font-mono text-ink-muted">{formatDateTime(new Date(u.created_at))}</span>
                    {u.status && <span className="ms-2">{TASK_STATUS[u.status as TaskStatus]}</span>}
                    {u.note && <span className="ms-2">{u.note}</span>}
                    {u.evidence_path && (
                      <a href={`/my-tasks/evidence/${u.id}`} className="ms-2 text-primary [overflow-wrap:anywhere] hover:underline">
                        {u.file_name ?? "الدليل"}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
