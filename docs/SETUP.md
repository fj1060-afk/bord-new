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
