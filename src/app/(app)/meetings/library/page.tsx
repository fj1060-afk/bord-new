import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { libraryTemplates, templates } from "@/lib/item-templates";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { LibraryBrowser } from "./library-browser";

export const metadata: Metadata = { title: "مستودع البنود" };

export default async function ItemLibraryPage() {
  const viewer = await requirePage("/meetings");
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { data } = await supabase.from("agenda_item_library").select("id, title, kind, category, needs").order("created_at");
  const own = (data ?? []).map((r, i) => ({ ...libraryTemplates([r])[0], id: r.id, own: true, key: `own-${i}` }));
  const builtIn = templates().map((t, i) => ({ ...t, id: null, own: false, key: `std-${i}` }));

  return (
    <>
      <PageHeader section="الاجتماعات" title="مستودع البنود" />
      <p className="mb-4 max-w-3xl text-sm leading-7 text-ink-muted">
        صيغ بنود الاجتماعات المتعارف عليها في السوق السعودي، مع المستندات الداعمة لكل بند. تظهر هذه الصيغ اقتراحاتٍ عند كتابة عنوان البند، ويمكن إضافة صيغ خاصة بالشركة. السنوات في الصيغ تُحدَّث تلقائياً.
      </p>
      <LibraryBrowser items={[...own, ...builtIn]} organizer={organizer} />
    </>
  );
}
