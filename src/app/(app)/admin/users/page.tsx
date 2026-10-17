import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { adminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CreateUserForm, UserRow } from "./user-forms";

export const metadata: Metadata = { title: "المستخدمون" };

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

  const [{ data: rows }, { data: roles }] = await Promise.all([
    query,
    supabase.from("roles").select("id, name").order("created_at"),
  ]);
  const users: UserItem[] = (rows ?? []).map(({ user_roles, ...u }) => ({
    ...u,
    roleIds: (user_roles as { role_id: string }[]).map((r) => r.role_id),
  }));
  const canManage = can(viewer.permissions, "/admin/users", LEVELS.manage);
  const canEdit = can(viewer.permissions, "/admin/users", LEVELS.edit);

  return (
    <>
      <PageHeader section="الإدارة" title="المستخدمون" description="أضف المستخدمين وحدد أدوارهم، وعطّل من لم يعد بحاجة للوصول." />
      {canManage && !adminConfigured() && (
        <p role="alert" className="mb-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          إنشاء المستخدمين وإرسال الدعوات وتعطيل الحسابات متوقف: أضف <span dir="ltr">SUPABASE_SECRET_KEY</span> إلى متغيرات
          البيئة في Vercel ثم أعد النشر (راجع docs/SETUP.md).
        </p>
      )}
      {canManage && <CreateUserForm roles={roles ?? []} />}

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

      <div className="overflow-hidden rounded-lg border border-rule bg-surface">
        {users.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">لا يوجد مستخدمون مطابقون.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                roles={roles ?? []}
                isSelf={user.id === viewer.id}
                canEdit={canEdit}
                canManage={canManage}
                canDelete={can(viewer.permissions, "/admin/roles", LEVELS.manage)}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
