// Phase 11: circular resolutions (create, member vote, close) and the minutes tab tools.
// Usage: BASE_URL=... ADMIN=email:pass MEMBER=email:pass node e2e/secretary.mjs [dir]
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
    await page?.screenshot({ path: `${out}/secretary-${results.length}.png`, fullPage: true }).catch(() => {});
  }
}
const has = (t) => page.getByText(t).first().waitFor({ timeout: 15000 });
const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });
const card = () => page.locator("li", { hasText: `اعتماد عاجل ${stamp}` });

await step("طرح قرار بالتمرير على المجلس", async () => {
  await as("ADMIN");
  await go("/resolutions/circular");
  await page.click("summary:has-text('قرار جديد بالتمرير')");
  await page.locator("select[name=body]").selectOption({ index: 1 });
  await page.fill("input[name=title]", `اعتماد عاجل ${stamp}`);
  await page.fill("textarea[name=text]", "الموافقة على توقيع العقد.");
  await page.click("button:has-text('طرح للتصويت')");
  await has("طُرح القرار للتصويت");
});

await step("عضو المجلس يرى التنبيه ويصوّت", async () => {
  await as("MEMBER");
  await has("قرارات بالتمرير بانتظار التصويت");
  await go("/resolutions/circular");
  await card().locator("button:has-text('موافق')").first().click();
  await card().getByText("✓ موافق").waitFor({ timeout: 15000 });
});

await step("إغلاق التصويت واحتساب النتيجة", async () => {
  await as("ADMIN");
  await go("/resolutions/circular");
  await card().getByText("موافق 1").or(card().getByText(/موافق\s*1/)).first().waitFor({ timeout: 15000 });
  await card().locator("button:has-text('إغلاق التصويت')").click();
  await card().getByText("لم يصدر").or(card().getByText("صدر")).first().waitFor({ timeout: 15000 });
});

await step("تبويب المحضر يعرض الملاحظات والتحفظات", async () => {
  await go("/minutes");
  const href = await page.locator("a[href*='tab=minutes']").first().getAttribute("href");
  await go(href);
  await has("الملاحظات والتحفظات");
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
