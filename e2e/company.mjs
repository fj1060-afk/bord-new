// Phase 9: company profile saves, warns below statutory floors, and limits the term.
// Usage: BASE_URL=... ADMIN=email:pass MEMBER=email:pass node e2e/company.mjs [dir]
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const results = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let page;
async function as(name) {
  await page?.context().close();
  page = await (await browser.newContext()).newPage();
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
    await page?.screenshot({ path: `${out}/company-${results.length}.png`, fullPage: true }).catch(() => {});
  }
}
const save = async (fields) => {
  await page.goto(base + "/admin/company", { waitUntil: "networkidle" });
  for (const [k, v] of Object.entries(fields)) await page.fill(`input[name=${k}]`, String(v));
  await page.click("button:has-text('حفظ')");
  await page.getByText("حُفظ ملف الشركة").waitFor({ timeout: 15000 });
};

await step("حفظ ملف الشركة ورفض نصاب أقل من النصف", async () => {
  await as("ADMIN");
  await page.goto(base + "/admin/company", { waitUntil: "networkidle" });
  await page.selectOption("select[name=company_type]", "listed_jsc");
  await page.fill("input[name=quorum_percent]", "40");
  await page.click("button:has-text('حفظ')");
  if (await page.getByText("حُفظ ملف الشركة").isVisible({ timeout: 3000 }).catch(() => false)) throw new Error("accepted 40%");
  await save({ name: "شركة تجريبية", quorum_percent: 50, min_board_meetings: 2, max_term_years: 3 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("نظام الشركات (م80) يوجب").waitFor({ timeout: 10000 });
});

await step("مدة الدورة محدودة بإعداد الشركة", async () => {
  await page.goto(base + "/board", { waitUntil: "networkidle" });
  const options = await page.locator("select[name=term_years] option").allTextContents();
  if (options.some((o) => o.includes("4") || o.includes("5"))) throw new Error(`options: ${options.join(",")}`);
});

await step("استعادة الإعدادات الافتراضية", async () => {
  await save({ min_board_meetings: 4, max_term_years: 4 });
});

await step("عضو المجلس لا يدخل ملف الشركة", async () => {
  await as("MEMBER");
  const res = await page.goto(base + "/admin/company", { waitUntil: "networkidle" });
  if (res?.status() !== 404) throw new Error(`status ${res?.status()}`);
});

await browser.close();
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
