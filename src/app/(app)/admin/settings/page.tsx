import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { aiConfig } from "@/lib/ai";
import { serviceSettings } from "@/lib/ai-server";
import { EndSessionButton } from "./end-session-button";
import { ServicesForm } from "./services-form";

export const metadata: Metadata = { title: "الإعدادات" };

const ENTITY_LABELS: Record<string, string> = {
  profiles: "المستخدمون",
  user_roles: "أدوار المستخدمين",
  roles: "الأدوار",
  role_permissions: "الصلاحيات",
  sessions: "الجلسات",
  service_settings: "إعدادات الموقع",
};
const ACTION_LABELS: Record<string, string> = {
  insert: "إضافة",
  update: "تعديل",
  delete: "حذف",
  end_session: "إنهاء جلسة",
};

type Session = { id: string; full_name: string; created_at: string; refreshed_at: string | null; user_agent: string | null; ip: string | null };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const viewer = await requirePage("/admin/settings");
  const { entity = "" } = (await searchParams) as { entity?: string };
  const supabase = await createClient();

  let auditQuery = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, actor:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (entity in ENTITY_LABELS) auditQuery = auditQuery.eq("entity_type", entity);

  const [{ data: sessions }, { data: logs }, services] = await Promise.all([supabase.rpc("list_sessions"), auditQuery, serviceSettings(supabase)]);
  const { ready, host, model } = aiConfig(process.env);
  const canEndAny = can(viewer.permissions, "/admin/settings", LEVELS.manage);

  return (
    <>
      <PageHeader section="الإدارة" title="الإعدادات" description="الخدمات الخارجية والاجتماعات والخصوصية، والجلسات النشطة، وسجل العمليات الحساسة." />

      <ServicesForm settings={services} ai={{ ready, host, model }} canManage={canEndAny} />

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-bold">الجلسات النشطة</h2>
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-paper text-start text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">المستخدم</th>
                <th className="px-4 py-2.5 text-start font-medium">الجهاز</th>
                <th className="px-4 py-2.5 text-start font-medium">آخر نشاط</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {((sessions ?? []) as Session[]).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.full_name || "—"}</td>
                  <td className="max-w-64 truncate px-4 py-3 text-ink-muted" dir="ltr" title={s.user_agent ?? ""}>
                    {s.user_agent ?? "—"} {s.ip && `· ${s.ip}`}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDateTime(new Date(s.refreshed_at ?? s.created_at))}</td>
                  <td className="px-4 py-3 text-end">{canEndAny && <EndSessionButton sessionId={s.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">سجل التدقيق</h2>
          <form className="flex gap-2">
            <select name="entity" defaultValue={entity} className="rounded-md border border-rule bg-surface px-3 py-1.5 text-sm">
              <option value="">كل العمليات</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-rule bg-surface px-3 py-1.5 text-sm hover:bg-primary-soft">تصفية</button>
          </form>
        </div>
        <ol className="divide-y divide-rule rounded-lg border border-rule bg-surface">
          {(logs ?? []).length === 0 && <li className="p-6 text-center text-sm text-ink-muted">لا توجد عمليات مسجلة.</li>}
          {(logs ?? []).map((log) => {
            const actor = log.actor as unknown as { full_name: string; email: string } | null;
            return (
              <li key={log.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="font-mono text-xs text-ink-muted">{formatDateTime(new Date(log.created_at))}</span>
                <span className="font-medium">{actor?.full_name || actor?.email || "النظام"}</span>
                <span>
                  {ACTION_LABELS[log.action] ?? log.action} · {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
