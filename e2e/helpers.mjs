// 本機端對端測試的共用工具。需要：本機 Supabase（npx supabase start）＋ npm run dev。
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

export const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
export const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const SHOTS = process.env.SHOTS_DIR ?? "e2e/screenshots";
mkdirSync(SHOTS, { recursive: true });

export function sql(q) {
  return execFileSync("psql", [DB, "-qAt", "-v", "ON_ERROR_STOP=1", "-c", q], { encoding: "utf8" }).trim();
}

export async function launch() {
  return chromium.launch();
}

// 以手機尺寸開一個獨立的登入身分
export async function newUser(browser, name) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: "zh-TW" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [${name}] pageerror:`, e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource|_next\/hmr/.test(m.text())) console.log(`  [${name}] console:`, m.text().slice(0, Number(process.env.LOGLEN ?? 300)));
  });
  const email = `${name}-${Date.now()}@e2e.local`;
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: "還沒有帳號？註冊" }).click();
  await page.fill("#email", email);
  await page.fill("#password", "test-password-123");
  await page.check('input[name="agree"]');
  await page.getByRole("button", { name: "註冊", exact: true }).click();
  await page.waitForURL("**/welcome");
  await page.fill("#username", name);
  await page.getByRole("button", { name: "開始使用" }).click();
  await page.waitForURL(BASE + "/");
  const id = sql(`select id from public.profiles where username = '${name}'`);
  // 測試用：把帳號年齡調成 60 天，避開新帳號限制
  sql(`update public.profiles set created_at = now() - interval '60 days' where id = '${id}'`);
  return { ctx, page, id, name, email };
}

let pngCache;
export async function testImage(browser, w = 3000, h = 2000) {
  if (pngCache) return pngCache;
  const ctx = await browser.newContext({ viewport: { width: w / 2, height: h / 2 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.setContent(`<body style="margin:0;background:linear-gradient(135deg,#1f6b4a,#e6c15a 60%,#3a2a18)"><h1 style="font:120px sans-serif;color:#fff;padding:80px">beetle test</h1></body>`);
  pngCache = await p.screenshot({ type: "png" });
  await ctx.close();
  return pngCache;
}

export async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

export function step(msg) {
  console.log("✓", msg);
}

export function cleanup() {
  // 測試資料清理：時間軸有防刪保護，僅在本機測試以 replica 模式繞過
  sql(`set session_replication_role = replica; delete from public.order_events where order_id in (select id from public.orders where buyer_id in (select id from auth.users where email like '%@e2e.local')); delete from public.credit_events where user_id in (select id from auth.users where email like '%@e2e.local'); set session_replication_role = origin;
       delete from public.orders where buyer_id in (select id from auth.users where email like '%@e2e.local') or seller_id in (select id from auth.users where email like '%@e2e.local');
       delete from public.listings where seller_id in (select id from auth.users where email like '%@e2e.local');
       delete from auth.users where email like '%@e2e.local'`);
}

// 站內確認對話框（取代 confirm()）：按下觸發按鈕後，在對話框裡按確定
export async function confirmIn(page, name) {
  await page.locator("dialog[open]").getByRole("button", { name, exact: true }).click();
}
