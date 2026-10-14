"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { COMPANY_TYPES } from "@/lib/company";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const int = (fd: FormData, key: string, min: number, max: number) => {
  const n = Number(fd.get(key));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim().slice(0, 300) || null;

export async function saveCompanyProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/admin/company", LEVELS.edit);
  const type = String(fd.get("company_type"));
  if (!isOneOf(type, COMPANY_TYPES)) return { ok: false, message: "اختر نوع الشركة." };
  const numbers = {
    fiscal_year_end_month: int(fd, "fiscal_year_end_month", 1, 12),
    min_board_meetings: int(fd, "min_board_meetings", 1, 24),
    quorum_percent: int(fd, "quorum_percent", 50, 100),
    quorum_min_present: int(fd, "quorum_min_present", 1, 20),
    max_term_years: int(fd, "max_term_years", 1, 4),
    invite_days: int(fd, "invite_days", 0, 30),
  };
  if (Object.values(numbers).some((v) => v === null)) return { ok: false, message: "راجع الأرقام: النصاب 50% على الأقل، والدورة 4 سنوات كحد أقصى." };
  const appointed = String(fd.get("secretary_appointed_on") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_profile")
    .update({
      name: text(fd, "name") ?? "",
      company_type: type,
      ...numbers,
      proxy_allowed: fd.get("proxy_allowed") === "on",
      secretary_person_id: text(fd, "secretary_person_id"),
      secretary_appointed_on: /^\d{4}-\d{2}-\d{2}$/.test(appointed) ? appointed : null,
      secretary_resolution: text(fd, "secretary_resolution"),
      secretary_qualification: text(fd, "secretary_qualification"),
    })
    .eq("id", true);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath("/", "layout");
  return { ok: true, message: "حُفظ ملف الشركة." };
}
