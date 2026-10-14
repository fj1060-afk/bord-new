import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { TASK_STATUS, isOverdue, resolutionReference, riyadhToday, type TaskStatus } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";
import { ProgressForm } from "../resolutions/task-forms";

export const metadata: Metadata = { title: "مهامي" };

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  department: { name: string } | null;
  resolution: { id: string; number: number | null; year: number | null; text: string } | null;
};

export default async function MyTasksPage({ searchParams }: PageProps<"/my-tasks">) {
  const viewer = await requirePage("/my-tasks");
  const { show = "open" } = (await searchParams) as { show?: string };
  const supabase = await createClient();
  const { data: delegations } = await supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id);
  const departmentIds = (delegations ?? []).map((d) => d.department_id);

  let query = supabase
    .from("resolution_tasks")
    .select("id, title, description, due_date, status, department:departments(name), resolution:resolutions(id, number, year, text)")
    .order("due_date", { ascending: true, nullsFirst: false });
  query = departmentIds.length
    ? query.or(`assignee_user_id.eq.${viewer.id},department_id.in.(${departmentIds.join(",")})`)
    : query.eq("assignee_user_id", viewer.id);
  query = show === "done" ? query.eq("status", "done") : query.in("status", ["open", "in_progress"]);
  const { data } = await query;
  const tasks = (data ?? []) as unknown as Task[];
  const today = riyadhToday();

  return (
    <>
      <PageHeader section="عام" title="مهامي" description="المهام المسندة إليك أو إلى إدارتك من قرارات المجلس واللجان." />
      <nav className="mb-4 flex gap-2 text-sm" aria-label="الحالة">
        {[
          ["open", "قيد العمل"],
          ["done", "المنجزة"],
        ].map(([value, label]) => (
          <Link key={value} href={`/my-tasks?show=${value}`} className={clsx("rounded-full px-4 py-1.5", show === value ? "bg-primary text-on-primary" : "border border-rule bg-surface hover:bg-primary-soft")}>
            {label}
          </Link>
        ))}
      </nav>
      <ul className="flex flex-col gap-3">
        {tasks.length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا توجد مهام.</li>}
        {tasks.map((t) => {
          const overdue = isOverdue(t.due_date, t.status, today);
          return (
            <li key={t.id} className={clsx("rounded-lg border bg-surface p-5 text-sm", overdue ? "border-danger/50" : "border-rule")}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                {t.department && <span className="text-ink-muted">{t.department.name}</span>}
                {t.due_date && <span className={overdue ? "font-medium text-danger" : "text-ink-muted"}>{overdue ? "متأخرة · " : ""}حتى {t.due_date}</span>}
                <span className={t.status === "done" ? "text-primary" : "text-brass"}>{TASK_STATUS[t.status]}</span>
              </div>
              {t.resolution && (
                <p className="mt-1 text-xs text-ink-muted">
                  من القرار <span className="font-mono">{resolutionReference(t.resolution.number, t.resolution.year)}</span>: {t.resolution.text.slice(0, 160)}
                </p>
              )}
              {t.description && <p className="mt-2 whitespace-pre-line">{t.description}</p>}
              {t.status !== "done" && <ProgressForm taskId={t.id} current={t.status} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
