"use client";

import clsx from "clsx";
import { Pencil, Trash2, UserMinus } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { formatGregorianDate } from "@/lib/format";
import { removeDelegate } from "../departments/actions";
import { deleteUser } from "./actions";
import type { RoleOption, UserItem } from "./page";
import { RowMenu } from "@/components/ui/row-menu";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ") || "؟";

export function Avatar({ name, size = "size-9" }: { name: string; size?: string }) {
  return <span className={clsx("grid shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary", size)}>{initials(name)}</span>;
}

export function StatusPill({ user }: { user: UserItem }) {
  const off = user.status === "disabled";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs", off ? "border border-rule text-ink-muted" : "bg-primary-soft text-primary")}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {off ? "معطّل" : "نشط"}
    </span>
  );
}

const INVITE = { none: "لم تُرسل الدعوة", sent: "الدعوة مرسلة", accepted: "" } as const;

/** One user in a department's table: who, title, email, roles, status, joined, and actions. */
export function UserRow({ user, roles, group, selected, isSelf, canDelete, canEditDepartments, onEdit }: { user: UserItem; roles: RoleOption[]; group?: { id: string; name: string }; selected: boolean; isSelf: boolean; canDelete: boolean; canEditDepartments: boolean; onEdit: () => void }) {
  const names = roles.filter((r) => user.roleIds.includes(r.id)).map((r) => r.name);
  const who = user.full_name || user.email;
  return (
    <tr className={clsx("motion-colors hover:bg-paper", selected && "bg-primary-soft/40")}>
      <td className="py-3 pe-2 ps-4 sm:px-4">
        <button type="button" onClick={onEdit} className="flex items-center gap-3 text-start">
          <Avatar name={who} />
          <span className="min-w-0">
            <span className="block font-bold hover:text-primary">
              {who}
              {isSelf && <span className="ms-1.5 text-xs font-normal text-ink-muted">(أنت)</span>}
            </span>
            <span className="block text-xs text-ink-muted [overflow-wrap:anywhere] md:hidden" dir="ltr">
              {user.email}
            </span>
            {/* On a phone the status sits under the name instead of in its own column. */}
            <span className="mt-1 block sm:hidden">
              <StatusPill user={user} />
            </span>
          </span>
        </button>
      </td>
      <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">{user.job_title || "—"}</td>
      <td className="hidden px-4 py-3 md:table-cell" dir="ltr">
        <span className="block max-w-56 truncate text-end text-ink-muted">{user.email}</span>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="flex flex-wrap gap-1">
          {names.length === 0 && <span className="text-xs text-ink-muted">بدون دور</span>}
          {names.slice(0, 2).map((n) => (
            <span key={n} className="whitespace-nowrap rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">
              {n}
            </span>
          ))}
          {names.length > 2 && <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-muted">+{names.length - 2}</span>}
        </span>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <StatusPill user={user} />
        {user.status === "active" && INVITE[user.invite] && <span className="mt-1 block whitespace-nowrap text-[11px] text-ink-muted">{INVITE[user.invite]}</span>}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-ink-muted xl:table-cell">{formatGregorianDate(new Date(user.created_at)).replace(/^[^،]+،\s*/, "")}</td>
      <td className="px-2 py-3 sm:px-4">
        <span className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={onEdit} aria-label={`تعديل ${who}`} title="تعديل" className="motion-press hidden size-8 place-items-center rounded-md border border-rule text-ink-muted hover:border-primary hover:text-primary sm:grid">
            <Pencil size={15} aria-hidden="true" />
          </button>
          {((group && canEditDepartments) || (canDelete && !isSelf)) && (
            <RowMenu label={`إجراءات ${who}`}>
              {group && canEditDepartments && (
                <ConfirmButton action={removeDelegate.bind(null, group.id, user.id)} label={`إزالة ${who} من ${group.name}`} variant="menu" className="gap-2" icon={<><UserMinus size={15} aria-hidden="true" /> إزالة من {group.name}</>} confirm={`إزالة ${who} من ${group.name}؟ يبقى حسابه كما هو.`} />
              )}
              {canDelete && !isSelf && (
                <ConfirmButton action={deleteUser.bind(null, user.id)} label={`حذف ${who}`} variant="menu-danger" className="gap-2" icon={<><Trash2 size={15} aria-hidden="true" /> حذف المستخدم</>} confirm={`حذف حساب «${who}» نهائياً؟ يبقى سجله في الأشخاص والتدقيق، ولا يمكن التراجع.`} />
              )}
            </RowMenu>
          )}
        </span>
      </td>
    </tr>
  );
}
