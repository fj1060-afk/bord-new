import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { libraryTemplates, templates } from "@/lib/item-templates";
import { companyProfile } from "@/lib/live-server";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { LibraryBrowser } from "./library-browser";

export const metadata: Metadata = { title: "مستودع البنود" };

export default async function ItemLibraryPage() {
  const viewer = await requirePage("/meetings");
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();
  const [{ data }, profile] = await Promise.all([
    supabase.from("agenda_item_library").select("id, title, title_en, body, kind, category, needs").order("created_at"),
    companyProfile(supabase),
  ]);
  const own = (data ?? []).map((r, i) => ({ ...libraryTemplates([r])[0], id: r.id, own: true, key: `own-${i}` }));
  const builtIn = templates().map((t, i) => ({ ...t, id: null, own: false, key: `std-${i}` }));

  return (
    <>
      <PageHeader section="الاجتماعات" title="مستودع البنود" />
      <p className="mb-4 max-w-3xl text-sm leading-7 text-ink-muted">
        صيغ بنود اجتماعات المجلس ولجانه المتعارف عليها في السوق السعودي، بالعربية والإنجليزية ومع المستندات الداعمة لكل بند. تظهر اقتراحاتٍ عند كتابة عنوان البند، والسنوات والتواريخ متروكة فراغات (…) تُكمل عند إضافة البند. الصيغ الخاصة بالشركة تمر بمسح نظامي (نظام الشركات، لائحة الحوكمة، قواعد هيئة السوق المالية) قبل حفظها.
      </p>
      <LibraryBrowser items={[...own, ...builtIn]} organizer={organizer} listed={profile?.company_type === "listed_jsc"} />
    </>
  );
}
