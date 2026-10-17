import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Search } from "lucide-react";
import { buttonClass, compactInputClass, iconInputClass } from "@/components/ui/styles";
import { AddPanels } from "./add-panels";
import { PurgeTestData } from "./purge-test-data";
import { isTestDepartment, isTestPerson } from "@/lib/test-data";
import { CreateDepartmentForm } from "../departments/department-forms";
import type { DepartmentGroup } from "./department-groups";
import { UsersWorkspace } from "./users-workspace";

export const metadata: Metadata = { title: "المستخدمون والإدارات" };

export type RoleOption = { id: string; name: string };
/** Where the user's invitation stands: never sent, sent and not yet used, or accepted (has signed in). */
export type InviteState = "none" | "sent" | "accepted";
export type UserItem = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  phone: string | null;
  /** The department the user acts for, if any. */
  departmentId: string | null;
  status: "active" | "disabled";
  invited_at: string | null;
  created_at: string;
  invite: InviteState;
  roleIds: string[];
  /** Governance seats, set only from this page: on the board and per committee id. */
  seats: { board: { position: string; category: string } | null; committees: Record<string, string> };
};

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const viewer = await requirePage("/admin/users");
  const { q = "", status = "", dept = "", role = "" } = (await searchParams) as { q?: string; status?: string; dept?: string; role?: string };
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, job_title, phone, status, invited_at, created_at, user_roles(role_id)")
    .order("full_name");
  if (status === "active" || status === "disabled") query = query.eq("status", status);
  // Strip characters that have meaning in PostgREST filter syntax.
  const term = q.replace(/[,()*%\\]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

  const canEditDepartments = can(viewer.permissions, "/admin/departments", LEVELS.edit);
  const [{ data: rows }, { data: roles }, { data: deptRows }, { data: activeUsers }, signedIn] = await Promise.all([
    query,
    supabase.from("roles").select("id, name").order("created_at"),
    supabase.from("departments").select("id, name, code, status, department_delegates(user_id)").order("status").order("name"),
    canEditDepartments ? supabase.rpc("list_active_users") : Promise.resolve({ data: [] }),
    lastSignIns(),
  ]);
  const [{ data: people }, { data: boardSeats }, { data: committeeSeats }, { data: committees }] = await Promise.all([
    supabase.from("people").select("id, user_id").not("user_id", "is", null),
    supabase.from("board_members").select("person_id, position, category, board:boards!inner(status)").eq("status", "active").eq("board.status", "active"),
    supabase.from("committee_members").select("person_id, committee_id, position").eq("status", "active"),
    supabase.from("committees").select("id, name").eq("status", "active").order("name"),
  ]);
  const personOf = new Map((people ?? []).map((p) => [p.user_id as string, p.id]));
  const seatsOf = (userId: string): UserItem["seats"] => {
    const personId = personOf.get(userId);
    const board = (boardSeats ?? []).find((b) => b.person_id === personId);
    return {
      board: board ? { position: board.position, category: board.category } : null,
      committees: Object.fromEntries((committeeSeats ?? []).filter((c) => c.person_id === personId).map((c) => [c.committee_id, c.position])),
    };
  };
  const { data: everyone } = can(viewer.permissions, "/admin/roles", LEVELS.manage) ? await supabase.from("people").select("full_name") : { data: [] };
  const testPeople = (everyone ?? []).filter((p) => isTestPerson(p.full_name)).length;
  const groups: DepartmentGroup[] = (deptRows ?? []).map((d) => ({ id: d.id, name: d.name, code: d.code, status: d.status as DepartmentGroup["status"], userIds: (d.department_delegates as { user_id: string }[]).map((x) => x.user_id) }));
  const users: UserItem[] = (rows ?? [])
    .map(({ user_roles, ...u }) => ({
      ...u,
      roleIds: (user_roles as { role_id: string }[]).map((r) => r.role_id),
      departmentId: groups.find((g) => g.status === "active" && g.userIds.includes(u.id))?.id ?? null,
      invite: (signedIn.has(u.id) ? "accepted" : u.invited_at ? "sent" : "none") as InviteState,
      seats: seatsOf(u.id),
    }))
    .filter((u) => (!role || u.roleIds.includes(role)) && (!dept || (dept === "none" ? !groups.some((g) => g.userIds.includes(u.id)) : groups.find((g) => g.id === dept)?.userIds.includes(u.id))));
  const canManage = can(viewer.permissions, "/admin/users", LEVELS.manage);
  const canEdit = can(viewer.permissions, "/admin/users", LEVELS.edit);
  const filtering = !!(term || status || dept || role);
  const shown = filtering ? groups.filter((g) => g.userIds.some((id) => users.some((u) => u.id === id))) : groups;

  return (
    <>
      <PageHeader section="الإدارة" title="المستخدمون والإدارات" description="المستخدمون مجمّعون تحت إداراتهم: أضف مستخدماً أو إدارة، وحدد الأدوار، وعطّل من لم يعد بحاجة للوصول." />
      {canManage && !adminConfigured() && (
        <p role="alert" className="mb-6 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          إنشاء المستخدمين وإرسال الدعوات وتعطيل الحسابات متوقف: أضف <span dir="ltr">SUPABASE_SECRET_KEY</span> إلى متغيرات
          البيئة في Vercel ثم أعد النشر (راجع docs/SETUP.md).
        </p>
      )}
      <AddPanels
        search={
          <form className="flex flex-wrap gap-2" role="search">
            <label className="relative min-w-48 flex-1">
              <span className="sr-only">بحث</span>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-muted" />
              <input name="q" type="search" defaultValue={q} placeholder="ابحث بالاسم أو البريد الإلكتروني" className={iconInputClass} />
            </label>
            <select name="dept" defaultValue={dept} aria-label="الإدارة" className={compactInputClass}>
              <option value="">كل الإدارات</option>
              {groups
                .filter((g) => g.status === "active")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              <option value="none">بلا إدارة</option>
            </select>
            <select name="role" defaultValue={role} aria-label="الدور" className={compactInputClass}>
              <option value="">كل الأدوار</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status} aria-label="الحالة" className={compactInputClass}>
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="disabled">معطّل</option>
            </select>
            <button className={buttonClass("secondary")}>بحث</button>
          </form>
        }
        departmentForm={canEditDepartments ? <CreateDepartmentForm /> : undefined}
      />

      {filtering && users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا يوجد مستخدمون مطابقون.</p>
      ) : (
        <UsersWorkspace
          groups={shown}
          departments={groups.filter((g) => g.status === "active").map((g) => ({ id: g.id, name: g.name }))}
          committees={committees ?? []}
          users={users}
          roles={roles ?? []}
          rights={{ viewerId: viewer.id, canEdit, canManage, canDelete: can(viewer.permissions, "/admin/roles", LEVELS.manage), canEditDepartments }}
          open={filtering}
          showLoose={!dept || dept === "none"}
          activeUsers={(activeUsers ?? []) as { id: string; full_name: string; email: string }[]}
        />
      )}
      {can(viewer.permissions, "/admin/roles", LEVELS.manage) && <PurgeTestData people={testPeople} departments={groups.filter((g) => isTestDepartment(g.name)).length} />}
    </>
  );
}

/** Users who have signed in at least once (their invitation was accepted); empty without the admin key. */
async function lastSignIns(): Promise<Set<string>> {
  if (!adminConfigured()) return new Set();
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  return new Set((data?.users ?? []).filter((u) => u.last_sign_in_at).map((u) => u.id));
}
