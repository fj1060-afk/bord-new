"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Archive, ArchiveRestore, Building2, ChevronDown, Trash2, UserPlus, Users, X } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { Collapse } from "@/components/ui/collapse";
import { buttonClass } from "@/components/ui/styles";
import { deleteDepartment, setDepartmentStatus } from "../departments/actions";
import { AddDelegateForm } from "../departments/department-forms";
import type { RoleOption, UserItem } from "./page";
import { menuItem, RowMenu } from "@/components/ui/row-menu";
import { CreateUserForm } from "./user-forms";
import { UserRow } from "./user-row";

export type DepartmentGroup = { id: string; name: string; code: string | null; status: "active" | "archived"; userIds: string[] };
export type Rights = { viewerId: string; canEdit: boolean; canManage: boolean; canDelete: boolean; canEditDepartments: boolean };

const countText = (n: number) => (n === 0 ? "لا مستخدمين" : n === 1 ? "مستخدم واحد" : n === 2 ? "مستخدمان" : `${n} مستخدمين`);

/**
 * One department as a fold: its header (name, code, count, «إضافة مستخدم» and a menu of
 * department actions), then a compact table of its users. "group" is absent for users with no department.
 */
export function DepartmentBlock({
  group,
  users,
  roles,
  rights,
  initiallyOpen,
  selectedId,
  onEdit,
  activeUsers,
}: {
  group?: DepartmentGroup;
  users: UserItem[];
  roles: RoleOption[];
  rights: Rights;
  initiallyOpen: boolean;
  selectedId: string | null;
  onEdit: (id: string) => void;
  activeUsers: { id: string; full_name: string; email: string }[];
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [adding, setAdding] = useState<"new" | "existing" | null>(null);
  const archived = group?.status === "archived";
  const name = group?.name ?? "بلا إدارة";
  const canAdd = rights.canManage && !archived;
  const add = (what: "new" | "existing") => {
    setOpen(true);
    setAdding((a) => (a === what ? null : what));
  };

  const menu: ReactNode[] = [];
  if (group && rights.canEditDepartments && !archived)
    menu.push(
      <button key="existing" type="button" onClick={() => add("existing")} className={menuItem}>
        <Users size={15} aria-hidden="true" /> ضمّ مستخدم موجود
      </button>,
    );
  if (group && rights.canEditDepartments)
    menu.push(
      <ConfirmButton
        key="archive"
        action={setDepartmentStatus.bind(null, group.id, archived ? "active" : "archived")}
        label={archived ? `إعادة تفعيل ${group.name}` : `أرشفة ${group.name}`}
        variant="menu"
        className="gap-2"
        icon={archived ? <><ArchiveRestore size={15} aria-hidden="true" /> إعادة تفعيل الإدارة</> : <><Archive size={15} aria-hidden="true" /> أرشفة الإدارة</>}
        confirm={archived ? `إعادة تفعيل ${group.name}؟` : `أرشفة ${group.name}؟ تختفي من قوائم الاختيار وتبقى سجلاتها.`}
      />,
    );
  if (group && rights.canDelete)
    menu.push(
      <span key="delete" className="mt-1 block border-t border-rule pt-1">
        <ConfirmButton
          action={deleteDepartment.bind(null, group.id)}
          label={`حذف ${group.name}`}
          variant="menu-danger"
          className="gap-2"
          icon={<><Trash2 size={15} aria-hidden="true" /> حذف الإدارة</>}
          confirm={users.length ? `حذف «${group.name}» نهائياً؟ فيها ${countText(users.length)}؛ يُزال ربطهم بها وتبقى حساباتهم. لا يمكن التراجع.` : `حذف «${group.name}» نهائياً؟ لا يمكن التراجع.`}
        />
      </span>,
    );

  return (
    <section className={clsx("rounded-xl border bg-surface", group ? "border-rule" : "border-dashed border-rule")}>
      <div className="flex flex-wrap items-center gap-3 p-3 ps-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 basis-56 items-center gap-3 text-start">
          <span className={clsx("grid size-10 shrink-0 place-items-center rounded-lg", group && !archived ? "bg-primary-soft text-primary" : "bg-paper text-ink-muted")}>
            {group ? <Building2 size={18} aria-hidden="true" /> : <Users size={18} aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{name}</span>
              {group?.code && <span className="rounded border border-rule px-1.5 font-mono text-[11px] text-ink-muted">{group.code}</span>}
              {archived && <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-muted">مؤرشفة</span>}
            </span>
            <span className="text-xs text-ink-muted">{countText(users.length)}</span>
          </span>
          <ChevronDown size={18} aria-hidden="true" className={clsx("ms-auto shrink-0 text-ink-muted transition-transform duration-(--motion-menu)", open && "rotate-180")} />
        </button>
        {canAdd && (
          <button type="button" onClick={() => add("new")} aria-expanded={adding === "new"} className={buttonClass("secondary", "px-3 py-1.5 text-xs")}>
            {adding === "new" ? <X size={14} aria-hidden="true" /> : <UserPlus size={14} aria-hidden="true" />} إضافة مستخدم
          </button>
        )}
        {menu.length > 0 && <RowMenu label={`إجراءات ${name}`}>{menu}</RowMenu>}
      </div>

      <Collapse show={open}>
        <div className="border-t border-rule">
          <Collapse show={adding === "new"}>
            {canAdd && (
              <div className="border-b border-rule bg-paper p-5">
                <h3 className="mb-4 font-display text-base font-bold">مستخدم جديد في {name}</h3>
                <CreateUserForm roles={roles} departments={[]} departmentId={group?.id ?? ""} />
              </div>
            )}
          </Collapse>
          <Collapse show={adding === "existing"}>
            {group && rights.canEditDepartments && (
              <div className="border-b border-rule bg-paper p-5">
                <AddDelegateForm departmentId={group.id} users={activeUsers.filter((u) => !group.userIds.includes(u.id))} />
              </div>
            )}
          </Collapse>
          {users.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-muted">لا مستخدمين في {group ? "هذه الإدارة" : "هذا القسم"} بعد.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">المستخدم</th>
                  <th className="hidden px-4 py-2.5 text-start font-medium lg:table-cell">المسمى الوظيفي</th>
                  <th className="hidden px-4 py-2.5 text-start font-medium md:table-cell">البريد الإلكتروني</th>
                  <th className="hidden px-4 py-2.5 text-start font-medium md:table-cell">الأدوار</th>
                  <th className="hidden px-4 py-2.5 text-start font-medium sm:table-cell">الحالة</th>
                  <th className="hidden px-4 py-2.5 text-start font-medium xl:table-cell">تاريخ الانضمام</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">الإجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {users.map((u) => (
                  <UserRow key={u.id} user={u} roles={roles} group={group} selected={u.id === selectedId} isSelf={u.id === rights.viewerId} canDelete={rights.canDelete} canEditDepartments={rights.canEditDepartments} onEdit={() => onEdit(u.id)} />
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </Collapse>
    </section>
  );
}
