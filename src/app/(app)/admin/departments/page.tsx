import type { Metadata } from "next";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { removeDelegate, setDepartmentStatus } from "./actions";
import { AddDelegateForm, CreateDepartmentForm } from "./department-forms";

export const metadata: Metadata = { title: "الإدارات" };

type Row = {
  id: string;
  name: string;
  code: string | null;
  status: "active" | "archived";
  department_delegates: { user: { id: string; full_name: string; email: string } | null }[];
};

export default async function DepartmentsPage() {
  const viewer = await requirePage("/admin/departments");
  const canEdit = can(viewer.permissions, "/admin/departments", LEVELS.edit);
  const supabase = await createClient();

  const [{ data }, { data: users }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, code, status, department_delegates(user:profiles(id, full_name, email))")
      .order("status")
      .order("name"),
    canEdit ? supabase.rpc("list_active_users") : Promise.resolve({ data: [] }),
  ]);
  const departments = ((data ?? []) as unknown as Row[]).map((d) => ({
    ...d,
    delegates: d.department_delegates.flatMap(({ user }) => (user ? [user] : [])),
  }));

  return (
    <>
      <PageHeader
        section="الإدارة"
        title="الإدارات"
        description="الإدارات والأشخاص المخوّلون برفع المستندات ومتابعة المهام نيابة عنها."
      />
      {canEdit && (
        <div className="mb-6 rounded-lg border border-rule bg-surface p-5">
          <CreateDepartmentForm />
        </div>
      )}

      {departments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-ink-muted">
          لا توجد إدارات بعد.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {departments.map((d) => {
            const archived = d.status === "archived";
            return (
              <li key={d.id} className="rounded-lg border border-rule bg-surface p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold">
                    {d.name}
                    {d.code && <span className="ms-2 font-mono text-xs text-ink-muted">{d.code}</span>}
                    {archived && <span className="ms-2 text-xs font-normal text-ink-muted">(مؤرشفة)</span>}
                  </h2>
                  {canEdit && (
                    <ConfirmButton
                      action={setDepartmentStatus.bind(null, d.id, archived ? "active" : "archived")}
                      label={archived ? "إعادة تفعيل" : "أرشفة"}
                      variant={archived ? "secondary" : "danger"}
                      confirm={archived ? `إعادة تفعيل ${d.name}؟` : `أرشفة ${d.name}؟`}
                    />
                  )}
                </div>
                <p className="mb-2 text-sm text-ink-muted">المخوّلون</p>
                <ul className="mb-3 flex flex-wrap gap-2">
                  {d.delegates.length === 0 && <li className="text-sm text-ink-muted">لا يوجد مخوّلون.</li>}
                  {d.delegates.map((user) => (
                    <li key={user.id} className="flex items-center gap-2 rounded-full bg-primary-soft py-1 ps-3 pe-1 text-sm">
                      {user.full_name || user.email}
                      {canEdit && (
                        <ConfirmButton
                          action={removeDelegate.bind(null, d.id, user.id)}
                          label="إزالة"
                          confirm={`إزالة ${user.full_name || user.email} من مخوّلي ${d.name}؟`}
                        />
                      )}
                    </li>
                  ))}
                </ul>
                {canEdit && !archived && <AddDelegateForm departmentId={d.id} users={users ?? []} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
