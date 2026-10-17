// End-to-end walk through phases 1-3 against a running app and the real Supabase project.
// Usage: BASE_URL=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... node e2e/full-flow.mjs [screenshot-dir]
// Creates clearly labelled test data ("اختبار ...").
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const stamp = Date.now().toString().slice(-5);
const results = [];
const problems = [];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  // Chromium ignores HTTPS_PROXY unless it is passed in explicitly.
  proxy: process.env.HTTPS_PROXY && !base.includes("localhost") ? { server: process.env.HTTPS_PROXY } : undefined,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("dialog", (d) => (d.type() === "prompt" ? d.accept("يرجى التحديث") : d.accept()));
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("response", (r) => r.status() >= 500 && problems.push(`${r.status()} ${r.url()}`));

async function step(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    results.push(`❌ ${name}: ${e.message.split("\n")[0]}`);
  } finally {
    await page.screenshot({ path: `${out}/${String(results.length).padStart(2, "0")}.png`, fullPage: true }).catch(() => {});
  }
}
const go = (path) => page.goto(base + path, { waitUntil: "networkidle" });
const status = async (text) => page.getByRole("status").filter({ hasText: text }).first().waitFor({ timeout: 20000 });

/** Passes the journey's warning-level checks with a reason, as a secretary would. */
async function passWarnings() {
  // The stage's checks sit in the «عرض المتطلبات» fold, closed when only warnings remain.
  const fold = page.locator("details#requirements:not([open]) > summary");
  if (await fold.count()) await fold.click();
  for (let i = 0; i < 6 && (await page.locator("summary:has-text('تجاوز بسبب')").count()); i++) {
    const s = page.locator("summary:has-text('تجاوز بسبب')").first();
    await s.click();
    const form = page.locator("details[open]:has(> summary:has-text('تجاوز بسبب')) form").first();
    await form.locator("input[name=reason]").fill("اختبار آلي");
    await form.locator("button:has-text('تسجيل')").click();
    await page.waitForLoadState("networkidle");
    await page.reload({ waitUntil: "networkidle" });
  }
}

await step("تسجيل الدخول", async () => {
  await go("/login");
  await page.fill("input[name=email]", process.env.E2E_EMAIL);
  await page.fill("input[name=password]", process.env.E2E_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(base + "/", { timeout: 20000 });
});

await step("صفحات الإدارة تفتح", async () => {
  for (const path of ["/admin/users", "/admin/roles", "/admin/settings", "/admin/departments", "/board", "/committees", "/meetings"]) {
    const res = await go(path);
    if (!res || res.status() >= 400) throw new Error(`${path} → ${res?.status()}`);
  }
});

await step("إنشاء المجلس (إن لم يوجد)", async () => {
  await go("/board");
  // The edit form of an existing board has the same fields, so look for the create button.
  if (await page.getByRole("button", { name: "إنشاء المجلس" }).count()) {
    await page.fill("input[name=name]", "مجلس الإدارة");
    await page.fill("input[name=term_start]", "2026-01-01");
    await page.getByText("تنتهي الدورة في").waitFor();
    await page.click("text=إنشاء المجلس");
    await status("حُفظت");
  }
});

await step("تسجيل عضو جديد للمجلس", async () => {
  // Positions are changed only from the users page; registering a new member sets the first one.
  await go("/board/members/new");
  await page.fill("input[name=full_name]", `عضو اختبار ${stamp}`);
  const account = page.locator("input[name=create_account]");
  if (await account.isChecked()) await account.uncheck();
  await page.click("button:has-text('تسجيل العضو')");
  await page.waitForURL(/\/people\/[0-9a-f-]{36}/, { timeout: 20000 });
});

await step("إنشاء إدارة ثم حذفها", async () => {
  await go("/admin/users");
  await page.click("button:has-text('إضافة إدارة')");
  await page.fill("input[name=name]", `إدارة اختبار ${stamp}`);
  await page.click("button:has-text('إضافة الإدارة')");
  await status("أُنشئت الإدارة");
  // Test departments would otherwise pile up in the list.
  // Department actions live in its «⋮» menu.
  await page.click(`summary[aria-label='إجراءات إدارة اختبار ${stamp}']`);
  await page.click(`details[open]:has(> summary[aria-label='إجراءات إدارة اختبار ${stamp}']) button:has-text('حذف الإدارة')`);
  await page.locator(`button:has-text('إدارة اختبار ${stamp}')`).waitFor({ state: "detached", timeout: 20000 });
});

await step("إنشاء لجنة", async () => {
  await go("/committees");
  await page.click("summary:has-text('لجنة جديدة')");
  await page.fill("input[name=name]", `لجنة اختبار ${stamp}`);
  await page.click("button:has-text('إنشاء اللجنة')");
  await page.waitForURL(/\/committees\/[0-9a-f-]{36}/, { timeout: 20000 });
});

await step("حذف لجنة الاختبار", async () => {
  // Test committees would otherwise pile up in the sidebar and the archive.
  await go("/committees");
  await page.click(`button[aria-label='حذف لجنة اختبار ${stamp}']`);
  await page.locator(`a:has-text('لجنة اختبار ${stamp}')`).waitFor({ state: "detached", timeout: 20000 });
});

let meetingUrl = "";
await step("إنشاء اجتماع للمجلس", async () => {
  // From the board's own pages the body is fixed to the board.
  await go("/board/meetings");
  await page.click("a:has-text('اجتماع جديد')");
  await page.waitForURL(/\/meetings\/new\?body=board:/, { timeout: 20000 });
  await page.fill("input[name=title]", `اجتماع اختبار ${stamp}`);
  await page.fill("input[name=date]", "2026-12-20");
  await page.fill("input[name=location]", "قاعة المجلس");
  await page.click("button:has-text('إنشاء الاجتماع')");
  await page.waitForURL(/\/meetings\/[0-9a-f-]{36}/, { timeout: 20000 });
  meetingUrl = page.url().split("?")[0];
});

await step("إضافة بند للأجندة", async () => {
  await page.goto(meetingUrl + "?tab=agenda", { waitUntil: "networkidle" });
  await page.click("summary:has-text('إضافة بند')");
  await page.fill("form:has(button:has-text('إضافة البند')) input[name=title]", "اعتماد الميزانية");
  await page.selectOption("form:has(button:has-text('إضافة البند')) select[name=kind]", "decision");
  await page.selectOption("form:has(button:has-text('إضافة البند')) select[name=owner]", { label: `إدارة اختبار ${stamp}` });
  await page.click("button:has-text('إضافة البند')");
  await status("أُضيف البند");
});

await step("رفع مستند على البند", async () => {
  await page.goto(meetingUrl + "?tab=agenda", { waitUntil: "networkidle" });
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  await page.locator("input[type=file]").first().setInputFiles({ name: "الميزانية.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.locator("input[placeholder='عنوان المستند (اختياري)']").first().fill("مسودة الميزانية");
  await page.locator("button:has-text('رفع مستند')").first().click();
  await status("رُفع المستند");
});

await step("طلب مستند من الإدارة", async () => {
  await page.click("summary:has-text('طلب مستند داعم من المسؤول')");
  // Scope to the request form: the hidden "add item" form has a department select too.
  const request = page.locator("form:has(button:has-text('إرسال الطلب'))").first();
  await request.locator("input[placeholder='المستند المطلوب']").fill("تقرير الربع الثالث");
  await request.locator("select[name=target]").selectOption({ label: `إدارة اختبار ${stamp}` });
  await page.click("button:has-text('إرسال الطلب')");
  await status("أُرسل طلب المستند");
});

await step("اعتماد الموعد ونشر الحزمة", async () => {
  // The preparation stage opens on the agenda; the approval button is under «بيانات عامة».
  await page.goto(meetingUrl + "?tab=overview", { waitUntil: "networkidle" });
  await passWarnings();
  await page.click("button:has-text('اعتماد الموعد')");
  await page.getByText("مُجدول").first().waitFor({ timeout: 20000 });
  await page.click("button:has-text('نشر حزمة المجلس')");
  await page.waitForLoadState("networkidle");
  await page.reload({ waitUntil: "networkidle" });
  await passWarnings();
});

await step("فتح المستند المرفوع", async () => {
  await page.goto(meetingUrl + "?tab=agenda", { waitUntil: "networkidle" });
  const href = await page.locator("a:has-text('مسودة الميزانية')").getAttribute("href");
  const res = await page.request.get(base + href, { maxRedirects: 0 });
  const location = res.headers().location ?? "";
  if (res.status() !== 307 || !location.includes("supabase.co/storage")) throw new Error(`status ${res.status()}`);
  const file = await page.request.get(location);
  if (!file.ok()) throw new Error(`signed URL → ${file.status()}`);
});

await step("تقديم إفصاح لعضو", async () => {
  await go("/board/members");
  await page.click(`a:has-text('عضو اختبار ${stamp}')`);
  await page.click("button:has-text('تقديم الإفصاح')");
  // Once filed, the form is replaced by the disclosure card, so its message never shows.
  await page.getByText("بانتظار المراجعة").first().waitFor({ timeout: 20000 });
});

await step("سجل التدقيق يسجّل العمليات", async () => {
  await go("/admin/settings");
  await page.getByText("الاجتماعات").or(page.getByText("meetings")).first().waitFor({ timeout: 10000 }).catch(() => {});
  if ((await page.locator("ol li").count()) < 5) throw new Error("audit log looks empty");
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
