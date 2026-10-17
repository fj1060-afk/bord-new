import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { adminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Building2 } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { CreateDepartmentForm } from "../departments/department-forms";
import { DepartmentGroups, type DepartmentGroup } from "./department-groups";
import { CreateUserForm } from "./user-forms";

export const metadata: Metadata = { title: "المستخدمون والإدارات" };

export type RoleOption = { id: string; name: string };
export type UserItem = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  status: "active" | "disabled";
  invited_at: string | null;
  roleIds: string[];
};

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const viewer = await requirePage("/admin/users");
  const { q = "", status = "" } = (await searchParams) as { q?: string; status?: string };
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, job_title, status, invited_at, user_roles(role_id)")
    .order("full_name");
  if (status === "active" || status === "disabled") query = query.eq("status", status);
  // Strip characters that have meaning in PostgREST filter syntax.
  const term = q.replace(/[,()*%\\]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

  const canEditDepartments = can(viewer.permissions, "/admin/departments", LEVELS.edit);
  const [{ data: rows }, { data: roles }, { data: deptRows }, { data: people }, { data: activeUsers }] = await Promise.all([
    query,
    supabase.from("roles").select("id, name").order("created_at"),
    supabase.from("departments").select("id, name, code, status, department_delegates(user_id)").order("status").order("name"),
    supabase.from("people").select("id, full_name").is("user_id", null).order("full_name"),
    canEditDepartments ? supabase.rpc("list_active_users") : Promise.resolve({ data: [] }),
  ]);
  const groups: DepartmentGroup[] = (deptRows ?? []).map((d) => ({ id: d.id, name: d.name, code: d.code, status: d.status as DepartmentGroup["status"], userIds: (d.department_delegates as { user_id: string }[]).map((x) => x.user_id) }));
  const departments = groups.filter((g) => g.status === "active").map((g) => ({ id: g.id, name: g.name }));
  const users: UserItem[] = (rows ?? []).map(({ user_roles, ...u }) => ({
    ...u,
    roleIds: (user_roles as { role_id: string }[]).map((r) => r.role_id),
  }));
  const canManage = can(viewer.permissions, "/admin/users", LEVELS.manage);
  const canEdit = can(viewer.permissions, "/admin/users", LEVELS.edit);

  return (
    <>
      <PageHeader section="الإدارة" title="المستخدمون والإدارات" description="المستخدمون مجمّعون تحت إداراتهم: أضف مستخدماً أو إدارة، وحدد الأدوار، وعطّل من لم يعد بحاجة للوصول." />
      {canManage && !adminConfigured() && (
        <p role="alert" className="mb-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          إنشاء المستخدمين وإرسال الدعوات وتعطيل الحسابات متوقف: أضف <span dir="ltr">SUPABASE_SECRET_KEY</span> إلى متغيرات
          البيئة في Vercel ثم أعد النشر (راجع docs/SETUP.md).
        </p>
      )}
      <div className="mb-6 flex flex-col gap-3">
        {canManage && <CreateUserForm roles={roles ?? []} departments={departments} people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name }))} />}
        {canEditDepartments && (
          <details className="rounded-lg border border-rule bg-surface">
            <summary className={buttonClass("secondary", "m-4 w-fit cursor-pointer list-none")}>
              <Building2 size={16} aria-hidden="true" /> إضافة إدارة
            </summary>
            <div className="border-t border-rule p-5">
              <CreateDepartmentForm />
            </div>
          </details>
        )}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث بالاسم أو البريد"
          className="min-w-0 flex-1 rounded-md border border-rule bg-surface px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status} className="rounded-md border border-rule bg-surface px-3 py-2 text-sm">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="disabled">معطّل</option>
        </select>
        <button className="rounded-md border border-rule bg-surface px-4 py-2 text-sm hover:bg-primary-soft">بحث</button>
      </form>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا يوجد مستخدمون مطابقون.</p>
      ) : (
        <DepartmentGroups
          groups={term ? groups.filter((g) => g.userIds.some((id) => users.some((u) => u.id === id))) : groups}
          users={users}
          roles={roles ?? []}
          rights={{ viewerId: viewer.id, canEdit, canManage, canDelete: can(viewer.permissions, "/admin/roles", LEVELS.manage), canEditDepartments }}
          open={!!term || !!status}
          activeUsers={(activeUsers ?? []) as { id: string; full_name: string; email: string }[]}
        />
      )}
    </>
  );
}
