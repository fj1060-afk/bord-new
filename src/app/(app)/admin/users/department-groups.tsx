import { Archive, ArchiveRestore, Building2, ChevronDown, Trash2, UserMinus, Users } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { deleteDepartment, removeDelegate, setDepartmentStatus } from "../departments/actions";
import { AddDelegateForm } from "../departments/department-forms";
import type { RoleOption, UserItem } from "./page";
import { GroupActions } from "./group-actions";
import { CreateUserForm, UserRow } from "./user-forms";

export type DepartmentGroup = { id: string; name: string; code: string | null; status: "active" | "archived"; userIds: string[] };

type Rights = { viewerId: string; canEdit: boolean; canManage: boolean; canDelete: boolean; canEditDepartments: boolean };

/** The users grouped under the departments they act for, each department a fold; users with none come last. */
export function DepartmentGroups({ groups, users, roles, rights, open, activeUsers }: { groups: DepartmentGroup[]; users: UserItem[]; roles: RoleOption[]; rights: Rights; open: boolean; activeUsers: { id: string; full_name: string; email: string }[] }) {
  // A new user created inside a group joins that department ("" = none).
  const newUser = (departmentId: string) => (rights.canManage ? <CreateUserForm roles={roles} departments={[]} departmentId={departmentId} /> : undefined);
  const byId = new Map(users.map((u) => [u.id, u]));
  const departments = groups.filter((g) => g.status === "active").map((g) => ({ id: g.id, name: g.name }));
  // Every row keeps the same end space, so the chevrons line up whether or not a delete icon sits there.
  const pad = rights.canDelete ? "pe-16" : "pe-4";
  const placed = new Set(groups.flatMap((g) => g.userIds));
  const loose = users.filter((u) => !placed.has(u.id));

  const row = (user: UserItem, group?: DepartmentGroup) => (
    <UserRow
      key={user.id}
      user={user}
      roles={roles}
      isSelf={user.id === rights.viewerId}
      canEdit={rights.canEdit}
      canManage={rights.canManage}
      canDelete={rights.canDelete}
      departments={departments}
      extra={
        group && rights.canEditDepartments ? (
          <ConfirmButton action={removeDelegate.bind(null, group.id, user.id)} label={`إزالة ${user.full_name || user.email} من ${group.name}`} variant="secondary" icon={<UserMinus size={16} aria-hidden="true" />} confirm={`إزالة ${user.full_name || user.email} من ${group.name}؟ يبقى حسابه كما هو.`} />
        ) : undefined
      }
    />
  );

  return (
    <div className="motion-stagger flex flex-col gap-2">
      {groups.map((g) => {
        const members = g.userIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
        const archived = g.status === "archived";
        return (
          <div key={g.id} className="relative">
          <details open={open && members.length > 0} className="group/dept overflow-hidden rounded-lg border border-rule bg-surface">
            <summary className={`flex cursor-pointer list-none items-center gap-3 py-3 ps-4 hover:bg-paper [&::-webkit-details-marker]:hidden ${pad}`}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${archived ? "bg-paper text-ink-muted" : "bg-primary-soft text-primary"}`}>
                <Building2 size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{g.name}</span>
                  {g.code && <span className="rounded border border-rule px-1.5 font-mono text-[11px] text-ink-muted">{g.code}</span>}
                  {archived && <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-muted">مؤرشفة</span>}
                </span>
                <span className="block text-xs text-ink-muted">{members.length === 0 ? "لا مستخدمين" : members.length === 1 ? "مستخدم واحد" : `${members.length} مستخدمين`}</span>
              </span>
              <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/dept:rotate-180" />
            </summary>
            <div className="border-t border-rule">
              {members.length === 0 ? <p className="px-5 py-4 text-sm text-ink-muted">لا مستخدمين في هذه الإدارة بعد.</p> : <ul className="divide-y divide-rule">{members.map((u) => row(u, g))}</ul>}
              {!archived && (rights.canManage || rights.canEditDepartments) ? (
                <GroupActions
                  name={g.name}
                  newUser={newUser(g.id)}
                  existing={rights.canEditDepartments ? <AddDelegateForm departmentId={g.id} users={activeUsers.filter((u) => !g.userIds.includes(u.id))} /> : undefined}
                  extra={rights.canEditDepartments && <ArchiveButton g={g} />}
                />
              ) : (
                rights.canEditDepartments && (
                  <div className="flex justify-end border-t border-rule bg-paper px-5 py-3">
                    <ArchiveButton g={g} />
                  </div>
                )
              )}
            </div>
          </details>
          {/* In front of the department, outside its fold so it never opens or closes it. */}
          {rights.canDelete && (
            <span className="absolute end-3 top-3.5">
              <ConfirmButton action={deleteDepartment.bind(null, g.id)} label={`حذف ${g.name}`} icon={<Trash2 size={16} aria-hidden="true" />} confirm={`حذف «${g.name}» نهائياً؟ يُزال ربط مستخدميها بها، ولا يمكن التراجع.`} />
            </span>
          )}
          </div>
        );
      })}

      {(loose.length > 0 || rights.canManage) && (
        <details open={open || groups.length === 0} className="group/dept overflow-hidden rounded-lg border border-dashed border-rule bg-surface">
          <summary className={`flex cursor-pointer list-none items-center gap-3 py-3 ps-4 hover:bg-paper [&::-webkit-details-marker]:hidden ${pad}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper text-ink-muted">
              <Users size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">بلا إدارة</span>
              <span className="block text-xs text-ink-muted">{loose.length === 0 ? "لا مستخدمين" : loose.length === 1 ? "مستخدم واحد" : `${loose.length} مستخدمين`}</span>
            </span>
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/dept:rotate-180" />
          </summary>
          <div className="border-t border-rule">
            {loose.length > 0 && <ul className="divide-y divide-rule">{loose.map((u) => row(u))}</ul>}
            {rights.canManage && <GroupActions name="بلا إدارة" newUser={newUser("")} />}
          </div>
        </details>
      )}
    </div>
  );
}

function ArchiveButton({ g }: { g: DepartmentGroup }) {
  const archived = g.status === "archived";
  return (
    <ConfirmButton
      action={setDepartmentStatus.bind(null, g.id, archived ? "active" : "archived")}
      label={archived ? `إعادة تفعيل ${g.name}` : `أرشفة ${g.name}`}
      variant="secondary"
      icon={archived ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
      confirm={archived ? `إعادة تفعيل ${g.name}؟` : `أرشفة ${g.name}؟ تختفي من قوائم الاختيار وتبقى سجلاتها.`}
    />
  );
}
