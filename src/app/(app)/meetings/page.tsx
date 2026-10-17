import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Library, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/styles";
import { requirePage } from "@/lib/auth";
import { DOC_REQUEST_STATUS } from "@/lib/meetings";
import { can, LEVELS, type Level } from "@/lib/permissions";
import { isPortalUser, portalEnabled } from "@/lib/portal";
import { PortalMeetings } from "../_portal/portal-meetings";
import { createClient } from "@/lib/supabase/server";
import { MeetingsTable } from "./_components/meetings-table";
import { MeetingStats } from "./_components/meeting-stats";

export const metadata: Metadata = { title: "الاجتماعات" };

export default async function MeetingsPage({ searchParams }: PageProps<"/meetings">) {
  const viewer = await requirePage("/meetings");
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();
  // Department users see only their meetings, without the secretariat's tools (switched on per environment).
  if (portalEnabled() && isPortalUser((page, level) => can(viewer.permissions, page, level as Level | undefined)))
    return <PortalMeetings supabase={supabase} period={((await searchParams) as { period?: string }).period ?? ""} />;

  const [{ count: pendingRequests }, { data: docRequests }] = await Promise.all([
    supabase.from("agenda_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    organizer
      ? Promise.resolve({ data: [] })
      : supabase
          .from("document_requests")
          .select("id, title, due_date, status, agenda_item:agenda_items(meeting_id, title)")
          .in("status", ["requested", "returned"])
          .order("due_date"),
  ]);

  return (
    <>
      <PageHeader
        section="الحوكمة"
        title="الاجتماعات"
        description="جدولة الاجتماعات وإصدار الدعوات ومتابعة المحاضر."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/meetings/requests" className={buttonClass("secondary")}>
              <Inbox size={16} aria-hidden="true" /> طلبات البنود
              {(pendingRequests ?? 0) > 0 && <span className="rounded-full bg-brass px-1.5 font-mono text-xs text-on-primary">{pendingRequests}</span>}
            </Link>
            <Link href="/meetings/library" className={buttonClass("secondary")}>
              <Library size={16} aria-hidden="true" /> مستودع البنود
            </Link>
            {organizer && (
              <Link href="/meetings/new" className={buttonClass()}>
                <Plus size={16} aria-hidden="true" /> اجتماع جديد
              </Link>
            )}
          </div>
        }
      />

      {(docRequests ?? []).length > 0 && (
        <section className="mb-6 rounded-lg border border-brass bg-surface">
          <h2 className="border-b border-rule px-5 py-3 font-medium text-brass">مستندات مطلوبة من إدارتك</h2>
          <ul className="divide-y divide-rule">
            {(docRequests ?? []).map((r) => {
              const item = r.agenda_item as unknown as { meeting_id: string; title: string };
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-ink-muted">البند: {item.title}</span>
                  </span>
                  <span className="text-brass">{DOC_REQUEST_STATUS[r.status as keyof typeof DOC_REQUEST_STATUS]}</span>
                  {r.due_date && <span className="text-ink-muted">حتى {r.due_date}</span>}
                  <Link href={`/meetings/${item.meeting_id}?tab=agenda`} className={buttonClass("secondary", "px-3 py-1 text-xs")}>
                    رفع المستند
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <MeetingStats />

      <MeetingsTable base="/meetings" params={await searchParams} />
    </>
  );
}
