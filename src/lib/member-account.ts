import "server-only";
import { siteUrl } from "./site-url";
import { createAdminClient } from "./supabase/admin";

/**
 * A sign-in account for a newly registered board member, with the board
 * member role only. The caller has already checked the right to edit the
 * board; the secret key is needed because accounts and roles are admin data.
 * An existing account with the same email is reused.
 */
export async function provisionMemberAccount(email: string, fullName: string): Promise<{ userId: string; created: boolean } | { error: string }> {
  const admin = createAdminClient();
  let userId: string | null = null;
  let created = false;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: fullName } });
  if (data?.user) {
    userId = data.user.id;
    created = true;
  } else if (error?.code === "email_exists") {
    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    userId = profile?.id ?? null;
  }
  if (!userId) return { error: "تعذّر إنشاء حساب الدخول." };
  const { data: role } = await admin.from("roles").select("id").eq("key", "board_member").single();
  if (role) await admin.from("user_roles").upsert({ user_id: userId, role_id: role.id }, { onConflict: "user_id,role_id", ignoreDuplicates: true });
  return { userId, created };
}

/** Emails the link to set a password, as the users page does. */
export async function sendMemberInvite(userId: string, email: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/confirm?next=/set-password` });
  if (error) return false;
  await admin.from("profiles").update({ invited_at: new Date().toISOString() }).eq("id", userId);
  return true;
}
