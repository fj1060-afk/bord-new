import { PageHeader } from "@/components/ui/page-header";
import { PhaseStatusTag } from "@/components/ui/phase-tag";
import { phases } from "@/config/phases";
import { requirePage } from "@/lib/auth";
import { greeting } from "@/lib/dashboard";
import { loadDesk } from "@/lib/desk-server";
import { formatGregorianDate, formatHijriDate } from "@/lib/format";
import { can, LEVELS, type Level } from "@/lib/permissions";
import { isPortalUser, portalEnabled } from "@/lib/portal";
import { PortalHome } from "./_portal/portal-home";
import { createClient } from "@/lib/supabase/server";
import { DeskView } from "./_dashboard/desk";

export default async function HomePage() {
  const viewer = await requirePage("/");
  const supabase = await createClient();
  // Department users get the requests portal's home (switched on per environment).
  if (portalEnabled() && isPortalUser((page, level) => can(viewer.permissions, page, level as Level | undefined)))
    return <PortalHome supabase={supabase} viewer={viewer} greeting={greeting()} />;
  const desk = await loadDesk(supabase, viewer);
  const today = new Date();

  return (
    <>
      <PageHeader
        section="لوحتي"
        title={`${greeting()}، ${viewer.fullName || "مرحباً"}`}
        description={`${desk.role} · ${formatGregorianDate(today)} · ${formatHijriDate(today)}`}
      />
      <DeskView desk={desk} />
      {can(viewer.permissions, "/admin/settings", LEVELS.manage) && (
        <details className="mt-8 rounded-lg border border-rule bg-surface">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">خطة بناء المنصة</summary>
          <ol className="flex flex-col gap-2 border-t border-rule px-5 py-3 text-sm">
            {phases.map((phase) => (
              <li key={phase.number} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-mono text-brass">{phase.number}</span> {phase.title}
                </span>
                <PhaseStatusTag status={phase.status} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}
