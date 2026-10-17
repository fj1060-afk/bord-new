"use server";

import { contactFields } from "@/lib/contact-rules";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ui/form";
import { POSITION_ROLES } from "@/lib/affiliations";
import { requirePage } from "@/lib/auth";
import { provisionMemberAccount, sendMemberInvite } from "@/lib/member-account";
import { BOARD_CATEGORIES, BOARD_POSITIONS, isOneOf, membershipError } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { adminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BASES = ["elected", "appointed_vacancy", "representative"] as const;
const text = (form: FormData, key: string, max = 300) => String(form.get(key) ?? "").trim().slice(0, max) || null;
const yearOf = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1950 && (v as number) <= 2100 ? (v as number) : null);

type PositionInput = { organization: string; role: string; title?: string; listed?: boolean; start_year?: number; end_year?: number | null };

/** Registers a board member in one go: their file, CV, board seat, and optionally a sign-in account with an invitation. */
export async function registerBoardMember(boardId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/board", LEVELS.edit);
  const fullName = text(form, "full_name", 200);
  const contact = contactFields(form);
  if (contact.problem) return { ok: false, message: contact.problem };
  const email = contact.email;
  const position = form.get("position");
  const category = form.get("category");
  const basis = form.get("appointment_basis");
  const account = form.get("create_account") === "on";
  if (!fullName) return { ok: false, message: "الاسم مطلوب." };
  if (!isOneOf(position, BOARD_POSITIONS) || !isOneOf(category, BOARD_CATEGORIES) || !(BASES as readonly unknown[]).includes(basis)) return { ok: false, message: "اختر المنصب والصفة وطريقة العضوية." };
  if (basis === "representative" && !text(form, "represents")) return { ok: false, message: "اذكر الجهة التي يمثلها العضو." };
  if (account && !email) return { ok: false, message: "البريد الإلكتروني مطلوب لإنشاء حساب الدخول." };
  if (account && !adminConfigured()) return { ok: false, message: "إنشاء الحسابات غير مهيأ على الخادم (SUPABASE_SECRET_KEY). سجّل العضو دون حساب، ثم أنشئه من صفحة المستخدمين." };
  let positions: PositionInput[] = [];
  try {
    positions = (JSON.parse(String(form.get("positions") || "[]")) as PositionInput[]).filter((p) => p.organization?.trim() && isOneOf(p.role, POSITION_ROLES)).slice(0, 40);
  } catch {
    return { ok: false, message: "تعذّرت قراءة السيرة الذاتية." };
  }

  const supabase = await createClient();
  const { data: person, error } = await supabase
    .from("people")
    .insert({
      full_name: fullName,
      full_name_en: text(form, "full_name_en", 200),
      email,
      phone: contact.phone,
      nationality: text(form, "nationality", 80),
      national_id: text(form, "national_id", 40),
      address: text(form, "address"),
      job_title: text(form, "job_title", 120),
      organization: text(form, "organization", 200),
      qualifications: text(form, "qualifications", 4000),
      experience: text(form, "experience", 4000),
    })
    .select("id")
    .single();
  if (error || !person) return { ok: false, message: "تعذّر حفظ بيانات العضو." };

  if (positions.length) {
    await supabase.from("person_positions").insert(
      positions.map((p) => ({
        person_id: person.id,
        organization: p.organization.trim().slice(0, 200),
        role: p.role,
        title: p.title?.trim().slice(0, 120) || null,
        listed: Boolean(p.listed),
        start_year: yearOf(p.start_year),
        end_year: yearOf(p.end_year),
      })),
    );
  }

  const { error: seatError } = await supabase.from("board_members").insert({
    board_id: boardId,
    person_id: person.id,
    position,
    category,
    start_date: String(form.get("start_date") || "") || undefined,
    appointment_basis: basis,
    appointment_ref: text(form, "appointment_ref", 200),
    represents: basis === "representative" ? text(form, "represents", 200) : null,
  });
  if (seatError) return { ok: false, message: `حُفظ ملف العضو ولم تُسجّل عضويته: ${membershipError(seatError.code, seatError.message)}` };

  let note = "";
  if (account && email) {
    const result = await provisionMemberAccount(email, fullName);
    if ("error" in result) note = "?account=failed";
    else {
      const { error: linkError } = await supabase.from("people").update({ user_id: result.userId }).eq("id", person.id);
      if (linkError) note = "?account=linked-elsewhere";
      else if (form.get("send_invite") === "on") note = (await sendMemberInvite(result.userId, email)) ? "?account=invited" : "?account=invite-failed";
      else note = "?account=created";
    }
  }
  revalidatePath("/board");
  redirect(`/people/${person.id}${note}`);
}
