import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CreateRoleForm, PermissionsForm } from "./role-forms";

export const metadata: Metadata = { title: "الأدوار والصلاحيات" };

export default async function RolesPage({ searchParams }: PageProps<"/admin/roles">) {
  const viewer = await requirePage("/admin/roles");
  const { role: selectedId } = (await searchParams) as { role?: string };
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system, role_permissions(page, level)")
    .order("created_at");
  const list = roles ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? list[0];
  const canManage = can(viewer.permissions, "/admin/roles", LEVELS.manage);

  return (
    <>
      <PageHeader
        section="الإدارة"
        title="الأدوار والصلاحيات"
        description="لكل دور مستوى وصول في كل صفحة: عرض، أو تعديل، أو إدارة. يحصل المستخدم على أعلى مستوى من بين أدواره."
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="flex flex-col gap-4">
          <nav aria-label="الأدوار" className="flex flex-col gap-1 rounded-lg border border-rule bg-surface p-2">
            {list.map((role) => (
              <Link
                key={role.id}
                href={`/admin/roles?role=${role.id}`}
                aria-current={role.id === selected?.id ? "page" : undefined}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm",
                  role.id === selected?.id ? "bg-primary-soft font-medium text-primary" : "hover:bg-paper",
                )}
              >
                {role.name}
                {!role.is_system && <span className="ms-2 text-xs text-brass">مخصص</span>}
              </Link>
            ))}
          </nav>
          {canManage && <CreateRoleForm />}
        </aside>

        {selected && (
          <section className="rounded-lg border border-rule bg-surface p-5">
            <h2 className="font-display text-xl font-bold">{selected.name}</h2>
            {selected.description && <p className="mt-1 text-sm text-ink-muted">{selected.description}</p>}
            <PermissionsForm
              key={selected.id}
              roleId={selected.id}
              current={Object.fromEntries(selected.role_permissions.map((p) => [p.page, p.level]))}
              locked={!canManage || selected.key === "system_admin"}
            />
          </section>
        )}
      </div>
    </>
  );
}
