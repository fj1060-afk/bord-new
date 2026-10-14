// Phase 7: governance office tabs and the director office (inbox, drafts, follow-ups, contacts).
// Usage: BASE_URL=... ADMIN=email:pass GOVERNANCE=... MEMBER=... node e2e/offices.mjs [dir]
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const stamp = Date.now().toString().slice(-5);
const results = [];
const problems = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let page;

async function as(name) {
  await page?.context().close();
  page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => problems.push(`${name} pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 500 && problems.push(`${name} ${r.status()} ${r.url()}`));
  const [email, password] = process.env[name].split(/:(.*)/s);
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL(base + "/", { timeout: 20000 });
}
async function step(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    results.push(`❌ ${name}: ${e.message.split("\n")[0]}`);
  } finally {
    await page?.screenshot({ path: `${out}/office-${String(results.length).padStart(2, "0")}.png`, fullPage: true }).catch(() => {});
  }
}
const has = async (text) => page.getByText(text).first().waitFor({ timeout: 15000 });
const go = (path) => page.goto(base + path, { waitUntil: "networkidle" });

await step("مكتب الحوكمة: مركز العمل والتقويم والمواعيد والتقارير", async () => {
  await as("GOVERNANCE");
  await go("/governance-office");
  for (const t of ["طلبات بنود معلّقة", "المحاضر", "متأخرات"]) await has(t);
  await go("/governance-office?tab=calendar");
  await has("أحداث الشهر");
  await page.click("text=الشهر التالي");
  await page.waitForURL(/m=\d{4}-\d{2}/);
  await go("/governance-office?tab=deadlines");
  for (const t of ["متأخرة", "خلال 7 أيام", "لاحقاً"]) await has(t);
  await go("/governance-office?tab=reports");
  await has("أداء المجلس واللجان");
});

await step("عضو المجلس لا يدخل المكاتب", async () => {
  await as("MEMBER");
  for (const p of ["/governance-office", "/director-office"]) {
    const res = await go(p);
    if (res?.status() !== 404) throw new Error(`${p} → ${res?.status()}`);
  }
});

await step("جهة اتصال جديدة", async () => {
  await as("ADMIN");
  await go("/director-office?tab=contacts");
  await page.click("summary:has-text('إضافة جهة اتصال')");
  await page.fill("input[name=name]", `هيئة السوق ${stamp}`);
  await page.fill("input[name=organization]", "هيئة السوق المالية");
  await page.fill("input[name=email]", "info@example.com");
  await page.click("button:has-text('حفظ')");
  await has("أُضيفت جهة الاتصال");
});

await step("تسجيل وارد بتاريخ متابعة", async () => {
  await go("/director-office?tab=inbox");
  await page.click("summary:has-text('تسجيل وارد')");
  await page.fill("input[name=subject]", `خطاب الهيئة ${stamp}`);
  await page.selectOption("select[name=contact_id]", { label: `هيئة السوق ${stamp} (هيئة السوق المالية)` });
  await page.fill("input[name=reference]", `W-${stamp}`);
  await page.fill("input[name=due_date]", "2026-01-01");
  await page.click("form button:has-text('حفظ')");
  await has("سُجّل الوارد");
  await go("/director-office?tab=followups");
  await has(`خطاب الهيئة ${stamp}`);
});

await step("معالجة الوارد ثم إغلاقه", async () => {
  await go("/director-office?tab=inbox");
  const row = () => page.locator("li", { hasText: `خطاب الهيئة ${stamp}` });
  await row().locator("button:has-text('بدء المعالجة')").click();
  await row().getByText("قيد المعالجة").waitFor();
  await row().locator("button:has-text('إغلاق')").click();
  await page.waitForLoadState("networkidle");
  await go("/director-office?tab=inbox&closed=1");
  await has(`خطاب الهيئة ${stamp}`);
});

await step("مسودة صادرة ثم إرسالها", async () => {
  await go("/director-office?tab=drafts");
  await page.click("summary:has-text('مسودة جديدة')");
  await page.fill("input[name=subject]", `رد على الهيئة ${stamp}`);
  await page.fill("textarea[name=body]", "نفيدكم بأنه تم ...");
  await page.click("form button:has-text('حفظ')");
  await has("حُفظت المسودة");
  await go("/director-office?tab=drafts");
  await page.locator("li", { hasText: `رد على الهيئة ${stamp}` }).locator("button:has-text('تم الإرسال')").click();
  await page.waitForLoadState("networkidle");
  await go("/director-office?tab=drafts&closed=1");
  await has(`رد على الهيئة ${stamp}`);
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
