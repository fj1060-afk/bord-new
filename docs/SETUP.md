# إعداد Supabase وVercel

مشروع Supabase: `bord` (المعرّف `ltxkvlxrrifqmtddlzdr`).

## 1. متغيرات البيئة في Vercel
| المتغير | القيمة |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ltxkvlxrrifqmtddlzdr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | من Supabase ← Project Settings ← API Keys |
| `SUPABASE_SECRET_KEY` | من نفس الصفحة ← Secret keys (سري، لا يُشارك) |
| `NEXT_PUBLIC_SITE_URL` | رابط الموقع على Vercel |

## 2. إعدادات Supabase Auth
- Authentication ← Sign In / Providers: أوقف **Allow new users to sign up**.
- Authentication ← URL Configuration: اجعل **Site URL** رابط الموقع.
- Authentication ← Emails ← Invite user: اجعل الرابط
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password`
- Authentication ← Emails ← Reset password: اجعل الرابط
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password`

## 3. تشغيل SQL مرة واحدة
SQL Editor ← الصق محتوى `supabase/migrations/0002_end_session.sql` ← Run.

## 4. أول مستخدم
Authentication ← Users ← Add user ← Send invitation لبريدك.
أول مستخدم يُنشأ يصبح **مدير النظام** تلقائياً، وبعده يضيف المدير الباقين من صفحة المستخدمين.

## 5. قبل الإطلاق
1. SQL Editor ← شغّل `supabase/migrations/0016_function_grants.sql` (يمنع غير المسجّلين من استدعاء دوال القاعدة).
2. Authentication ← Attack Protection: فعّل **Leaked password protection** إن كانت متاحة في باقتك.
3. أنشئ حسابك الحقيقي من صفحة المستخدمين وامنحه دور **مدير النظام**، ثم ادخل به.
4. SQL Editor ← شغّل `supabase/cleanup-test-data.sql` لحذف بيانات وحسابات الاختبار (`@bord.test`). يرفض العمل إن لم يوجد مدير حقيقي.
5. Storage: أفرغ الحاويات `meeting-documents` و`task-evidence` و`library` من ملفات الاختبار.
