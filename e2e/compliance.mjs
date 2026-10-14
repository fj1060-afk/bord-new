// Phase 10: compliance center, page notes and the audit committee rule.
// Usage: BASE_URL=... ADMIN=email:pass GOVERNANCE=email:pass node e2e/compliance.mjs [dir]
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const results = [];
const problems = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let page;
async function as(name) {
  await page?.context().close();
  page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on("dialog", (d) => d.accept());
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
    await page?.screenshot({ path: `${out}/compliance-${results.length}.png`, fullPage: true }).catch(() => {});
  }
}
const has = (t) => page.getByText(t).first().waitFor({ timeout: 15000 });
const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });

await step("مركز الامتثال يعرض القواعد ونسبة الامتثال", async () => {
  await as("GOVERNANCE");
  await go("/governance-office");
  for (const t of ["نسبة الامتثال", "عدد أعضاء المجلس ثلاثة على الأقل", "نظام الشركات · م67"]) await has(t);
});

await step("الرئيسية تعرض بطاقة الامتثال", async () => {
  await go("/");
  await has("الامتثال");
});

await step("ملاحظة الأنظمة في صفحة المجلس وإنشاء الاجتماع", async () => {
  await as("ADMIN");
  for (const [p, article] of [["/board", "م67"], ["/meetings/new", "م80/1"]]) {
    await go(p);
    await page.click("summary:has-text('ما تقوله الأنظمة')");
    await has(article);
  }
});

await step("تحديد لجنة كلجنة مراجعة يُفعّل قواعدها", async () => {
  await go("/committees");
  const href = await page.locator("a[href^='/committees/']").first().getAttribute("href");
  await go(href);
  await page.click("summary:has-text('تعديل اللجنة')");
  await page.locator("select[name=kind]").selectOption("audit");
  await page.click("button:has-text('حفظ التعديلات')");
  await page.waitForLoadState("networkidle");
  await go("/governance-office");
  await has("لا تضم أعضاء مجلس تنفيذيين");
  await go(href);
  await page.click("summary:has-text('تعديل اللجنة')");
  await page.locator("select[name=kind]").selectOption("other");
  await page.click("button:has-text('حفظ التعديلات')");
  await page.waitForLoadState("networkidle");
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
