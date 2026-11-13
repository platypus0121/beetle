import { BASE, cleanup, launch, newUser, shot, sql, step } from "./helpers.mjs";

cleanup();
const browser = await launch();
const see = async (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });
try {
  const spam = await newUser(browser, "e2eSpammer");
  const user = await newUser(browser, "e2eCitizen");
  const mod = await newUser(browser, "e2eMod");
  sql(`update public.profiles set role = 'moderator' where id = '${mod.id}'`);
  for (const p of [spam.page, user.page, mod.page]) p.on("dialog", (d) => d.accept());

  // 廣告文 → 檢舉 → 版主隱藏
  await spam.page.goto(`${BASE}/posts/new`);
  await spam.page.fill("#title", "超便宜菌瓶團購");
  await spam.page.fill("#body", "加我好友私下買比較便宜");
  await spam.page.getByRole("button", { name: "發布" }).click();
  await spam.page.waitForURL(/\/posts\/\d+$/);
  const postId = spam.page.url().split("/").pop();
  await user.page.goto(`${BASE}/posts/${postId}`);
  await user.page.getByRole("button", { name: "檢舉", exact: true }).click();
  await user.page.getByRole("dialog").getByText("廣告或洗版").click();
  await user.page.getByRole("dialog").getByRole("button", { name: "送出" }).click();
  await see(user.page, "已收到，謝謝你的回報");
  step("會員檢舉文章");

  const r = await user.page.goto(`${BASE}/admin`);
  if (r.status() !== 404) throw new Error("一般會員不應能進入後台");
  step("一般會員開啟後台得到 404");

  await mod.page.goto(`${BASE}/admin`);
  await see(mod.page, "待處理檢舉");
  await shot(mod.page, "40-admin-home");
  await mod.page.goto(`${BASE}/admin/reports`);
  await see(mod.page, "廣告或洗版");
  await mod.page.fill('input[name="note"]', "廣告導流");
  await shot(mod.page, "41-admin-reports");
  await mod.page.getByRole("button", { name: "隱藏內容並結案" }).click();
  await see(mod.page, "沒有待處理的檢舉");
  if (sql(`select status from public.posts where id = ${postId}`) !== "hidden") throw new Error("文章未被隱藏");
  const r2 = await user.page.goto(`${BASE}/posts/${postId}`);
  if (r2.status() !== 404) throw new Error("被隱藏的文章不應公開");
  step("版主在檢舉佇列隱藏內容；一般人看不到該文章");
  const n = sql(`select string_agg(type, ',' order by type) from public.notifications where user_id in ('${spam.id}','${user.id}') and type in ('moderation','report')`);
  if (n !== "moderation,report") throw new Error("通知不符 " + n);
  step("作者收到處置通知、檢舉人收到結果通知");

  // 停權
  await mod.page.goto(`${BASE}/admin/users?id=${spam.id}`);
  await mod.page.fill('input[name="reason"]', "張貼廣告");
  await mod.page.getByRole("button", { name: "停權", exact: true }).click();
  await see(mod.page, "停權至");
  await spam.page.goto(`${BASE}/posts/new`);
  await spam.page.fill("#title", "我又來了");
  await spam.page.fill("#body", "再發一次");
  await spam.page.getByRole("button", { name: "發布" }).click();
  await see(spam.page, "沒有權限執行這個操作");
  step("版主停權後，該帳號無法再發文");
  const r3 = await mod.page.goto(`${BASE}/admin/users?id=${mod.id}`);
  if (await mod.page.getByRole("button", { name: "變更角色" }).count()) throw new Error("版主不應看到角色設定");
  step("版主看不到指派角色的功能（僅管理員）");

  // 糾紛申訴 → 裁決
  await user.page.goto(`${BASE}/market/new`);
  await user.page.selectOption("#stage", "supply");
  await user.page.fill("#title", "二手恆溫酒櫃");
  await user.page.fill("#price", "3000");
  await user.page.getByText("面交", { exact: true }).click();
  await user.page.check('input[name="agreed"]');
  await user.page.getByRole("button", { name: "上架", exact: true }).click();
  await user.page.waitForURL(/\/market\/\d+$/);
  const lid = user.page.url().split("/").pop();
  const buyer = await newUser(browser, "e2eBuyerX");
  buyer.page.on("dialog", (d) => d.accept());
  await buyer.page.goto(`${BASE}/market/${lid}`);
  await buyer.page.check('input[name="agreed"]');
  await buyer.page.getByRole("button", { name: "我要購買" }).click();
  await buyer.page.waitForURL(/\/orders\/\d+$/);
  const oid = buyer.page.url().split("/").pop();
  await user.page.goto(`${BASE}/orders/${oid}`);
  await user.page.fill('input[name="bank_code"]', "700");
  await user.page.fill('input[name="account_no"]', "0001234567890");
  await user.page.fill('input[name="account_name"]', "測試");
  await user.page.getByRole("button", { name: "送出收款資訊" }).click();
  await see(user.page, "收款資訊已更新");
  await user.page.getByRole("button", { name: "接受訂單" }).click();
  await see(user.page, "等待買家付款");
  await buyer.page.reload();
  await buyer.page.fill("#last5", "11111");
  await buyer.page.getByRole("button", { name: "回報已付款" }).click();
  await see(buyer.page, "等待賣家確認");
  await buyer.page.getByRole("link", { name: "交易有問題？提出申訴" }).click();
  await buyer.page.fill("#description", "已經匯款三天，賣家一直沒有確認也不回覆訊息。");
  await buyer.page.getByRole("button", { name: "送出申訴" }).click();
  await see(buyer.page, "交易糾紛處理中");
  step("買家付款後賣家不回應 → 在交易單提出申訴");
  await mod.page.goto(`${BASE}/admin/disputes`);
  await mod.page.getByText(`交易單 #${oid}`).click();
  await mod.page.selectOption('select[name="fault"]', "seller");
  await mod.page.fill('textarea[name="note"]', "買家已提供付款回報，賣家逾期未回應，交易取消。");
  await mod.page.getByRole("button", { name: "送出裁決" }).click();
  await mod.page.waitForURL(/\/admin\/disputes$/);
  const res = sql(`select o.status || '/' || (select credit_score from public.profiles where id = '${user.id}') || '/' || (select status from public.listings where id = ${lid}) from public.orders o where o.id = ${oid}`);
  if (res !== "cancelled/85/active") throw new Error("裁決結果不符 " + res);
  await buyer.page.reload();
  await see(buyer.page, "站方裁決");
  await shot(buyer.page, "42-dispute-resolved");
  step("版主裁決：交易取消、賣方扣 15 分、商品重新上架，結果寫入交易單");
  await mod.page.goto(`${BASE}/admin/log`);
  await see(mod.page, "裁決申訴");
  step("操作紀錄留存");
  console.log("admin.mjs 全部通過");
} finally {
  await browser.close();
  cleanup();
}
