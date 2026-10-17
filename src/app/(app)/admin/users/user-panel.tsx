"use client";

import { useActionState, useState, useTransition } from "react";
import { Ban, MailCheck, RotateCcw, Send, Trash2, X } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Collapse } from "@/components/ui/collapse";
import { ConfirmButton } from "@/components/org/confirm-button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { TabBar } from "@/components/ui/tab-bar";
import { formatDateTime } from "@/lib/format";
import { deleteUser, sendInvitation, setUserStatus, updateUserRoles } from "./actions";
import { EditUserForm } from "./edit-user-form";
import { PositionsForm, positionsText } from "./positions-form";
import type { RoleOption, UserItem } from "./page";
import { RoleChecklist, SetPasswordForm } from "./user-forms";
import { Avatar, StatusPill } from "./user-row";

type Tab = "basic" | "positions" | "roles" | "account";
const TABS: [Tab, string][] = [
  ["basic", "البيانات"],
  ["positions", "المنصب"],
  ["roles", "الصلاحيات"],
  ["account", "إجراءات الحساب"],
];
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The side panel for one user: basic details, roles (save appears only after a change) and account actions. */
export function UserPanel({ user, roles, departments, committees, isSelf, canEdit, canManage, canDelete, onClose }: { user: UserItem; roles: RoleOption[]; departments: { id: string; name: string }[]; committees: { id: string; name: string }[]; isSelf: boolean; canEdit: boolean; canManage: boolean; canDelete: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("basic");
  const [picked, setPicked] = useState(user.roleIds);
  const [rolesState, rolesAction] = useActionState(updateUserRoles.bind(null, user.id), null);
  const [inviteState, inviteAction] = useActionState(sendInvitation.bind(null, user.id), null);
  const [pending, start] = useTransition();
  const who = user.full_name || user.email;
  const roleNames = roles.filter((r) => user.roleIds.includes(r.id)).map((r) => r.name);
  const disabled = user.status === "disabled";
  const invite = user.invite === "accepted" ? "قُبلت الدعوة: دخل المستخدم إلى المنصة." : user.invite === "sent" ? `أُرسلت الدعوة${user.invited_at ? ` في ${formatDateTime(new Date(user.invited_at))}` : ""} ولم تُستخدم بعد.` : "لم تُرسل الدعوة بعد.";

  return (
    <aside aria-label={`تعديل ${who}`} className="motion-enter flex flex-col rounded-xl border border-rule bg-surface lg:sticky lg:top-4">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="font-display text-lg font-bold">تعديل المستخدم</h2>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="motion-press grid size-8 place-items-center rounded-md text-ink-muted hover:bg-paper hover:text-ink">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center gap-3 px-5 pb-4">
        <Avatar name={who} size="size-12" />
        <span className="min-w-0">
          <span className="block truncate font-bold">{who}</span>
          <span className="block text-xs font-medium text-primary">{positionsText(user, committees) || user.job_title || "بلا منصب"}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            الصلاحيات: {roleNames.join("، ") || "بدون دور"}
            <StatusPill user={user} />
          </span>
        </span>
      </div>

      <TabBar id="user-panel" label="أقسام المستخدم" className="flex border-y border-rule text-sm">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined} className={`motion-colors flex-1 px-2 py-3 text-center ${tab === key ? "font-bold text-primary" : "text-ink-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </TabBar>

      <div key={tab} className="page-in p-5">
        {tab === "basic" &&
          (canManage ? (
            <EditUserForm user={user} departments={departments} onCancel={onClose} />
          ) : (
            <dl className="flex flex-col gap-3 text-sm">
              {[
                ["البريد الإلكتروني", user.email],
                ["الجوال", user.phone ?? "—"],
                ["المسمى الوظيفي", user.job_title ?? "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-ink-muted">{k}</dt>
                  <dd dir={k === "المسمى الوظيفي" ? undefined : "ltr"} className="text-end">{v}</dd>
                </div>
              ))}
            </dl>
          ))}

        {tab === "positions" &&
          (canManage ? (
            <PositionsForm user={user} committees={committees} />
          ) : (
            <p className="text-sm text-ink-muted">{positionsText(user, committees) || "بلا منصب في المجلس أو اللجان."}</p>
          ))}

        {tab === "roles" &&
          (isSelf || !canManage ? (
            <p className="text-sm text-ink-muted">{isSelf ? "لا يمكنك تعديل أدوارك بنفسك." : "عرض فقط."} الأدوار الحالية: {roleNames.join("، ") || "بدون دور"}.</p>
          ) : (
            <ActionForm action={rolesAction} state={rolesState} className="flex flex-col gap-3">
              <RoleChecklist roles={roles} selected={user.roleIds} onChange={setPicked} grid />
              <FormMessage state={rolesState} />
              <Collapse show={!same(picked, user.roleIds)}>
                <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-full">
                  حفظ التغييرات
                </SubmitButton>
              </Collapse>
            </ActionForm>
          ))}

        {tab === "account" &&
          (isSelf ? (
            <p className="text-sm text-ink-muted">لا يمكنك تعطيل حسابك أو تغيير دعوته بنفسك.</p>
          ) : (
            <div className="flex flex-col gap-5 text-sm">
              {canManage && !disabled && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-ink-muted">الدعوة</h3>
                  <p className="inline-flex items-start gap-2">
                    <MailCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" /> {invite}
                  </p>
                  {user.invite !== "accepted" && (
                    <ActionForm action={inviteAction} state={inviteState} className="flex flex-col gap-2">
                      <SubmitButton variant="secondary" pendingLabel="جارٍ الإرسال…" className="w-fit">
                        <Send size={15} aria-hidden="true" /> {user.invite === "sent" ? "إعادة إرسال الدعوة" : "إرسال الدعوة"}
                      </SubmitButton>
                      <FormMessage state={inviteState} />
                    </ActionForm>
                  )}
                </section>
              )}
              {canManage && !disabled && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-ink-muted">كلمة المرور</h3>
                  <SetPasswordForm user={user} />
                </section>
              )}
              {canEdit && (
                <section className="flex flex-col gap-2 border-t border-rule pt-4">
                  <h3 className="text-xs font-medium text-ink-muted">حالة الحساب</h3>
                  <button type="button" disabled={pending} onClick={() => start(() => setUserStatus(user.id, disabled ? "active" : "disabled"))} className={buttonClass(disabled ? "secondary" : "danger", "w-fit")}>
                    {disabled ? <RotateCcw size={15} aria-hidden="true" /> : <Ban size={15} aria-hidden="true" />} {disabled ? "إعادة تفعيل المستخدم" : "تعطيل المستخدم"}
                  </button>
                </section>
              )}
              {canDelete && (
                <ConfirmButton action={deleteUser.bind(null, user.id)} label={`حذف ${who}`} variant="menu-danger" className="gap-2" icon={<><Trash2 size={15} aria-hidden="true" /> حذف المستخدم نهائياً</>} confirm={`حذف حساب «${who}» نهائياً؟ يبقى سجله في الأشخاص والتدقيق، ولا يمكن التراجع.`} />
              )}
            </div>
          ))}
      </div>
    </aside>
  );
}
