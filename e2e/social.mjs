import { BASE, cleanup, launch, newUser, shot, sql, step, testImage } from "./helpers.mjs";

cleanup();
const browser = await launch();
const see = async (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });
try {
  const a = await newUser(browser, "e2eAnn");
  const b = await newUser(browser, "e2eBen");
  const c = await newUser(browser, "e2eCat");
  const png = await testImage(browser);
  a.page.on("dialog", (d) => d.accept());

  // 追蹤與好友
  await a.page.goto(`${BASE}/u/${b.id}`);
  await a.page.getByRole("button", { name: "＋ 追蹤" }).click();
  await a.page.getByRole("button", { name: "✓ 追蹤中" }).waitFor();
  await a.page.getByRole("button", { name: "＋ 加好友" }).click();
  await a.page.getByRole("button", { name: /已送出邀請/ }).waitFor();
  step("追蹤、送出好友邀請");
  await b.page.goto(`${BASE}/friends`);
  await see(b.page, "收到的邀請（1）");
  await shot(b.page, "20-friends");
  await b.page.getByRole("button", { name: "接受好友邀請" }).click();
  await see(b.page, "好友（1）");
  step("對方在好友頁接受邀請");
  await b.page.goto(`${BASE}/notifications`);
  await see(b.page, "e2eAnn 開始追蹤你");
  await see(b.page, "e2eAnn 想加你為好友");
  await shot(b.page, "21-notifications");
  step("通知中心顯示追蹤與好友邀請");

  // 私訊：即時更新、已讀、圖片
  await b.page.goto(`${BASE}/messages/new?to=${a.id}`);
  await b.page.getByLabel("訊息").fill("嗨，上次的幼蟲長得好嗎？");
  await b.page.getByRole("button", { name: "傳送", exact: true }).click();
  await b.page.waitForURL(/\/messages\/\d+$/);
  const conv = b.page.url().split("/").pop();
  await a.page.goto(`${BASE}/messages`);
  await see(a.page, "嗨，上次的幼蟲長得好嗎？");
  await a.page.goto(`${BASE}/messages/${conv}`);
  await a.page.getByLabel("訊息").fill("很好，已經 30g 了");
  await a.page.getByRole("button", { name: "傳送", exact: true }).click();
  await see(b.page, "很好，已經 30g 了"); // b 沒有重新整理：Realtime
  step("私訊即時送達（對方不需重新整理）");
  await a.page.setInputFiles('input[type="file"]', [{ name: "x.png", mimeType: "image/png", buffer: png }]);
  await b.page.locator('img[alt="圖片"]').waitFor({ timeout: 20000 });
  step("私訊傳圖片（私有 bucket，簽名網址）");
  await b.page.getByLabel("訊息").fill("我的帳號 822-123456789012 你直接匯款給我比較快");
  await see(b.page, "小心詐騙");
  await b.page.getByRole("button", { name: "傳送", exact: true }).click();
  await see(a.page, "小心詐騙");
  await shot(a.page, "22-dm-scam-warning");
  step("私訊出現帳號／匯款字樣：雙方畫面顯示詐騙警示");
  const cRead = await c.page.goto(`${BASE}/messages/${conv}`);
  if (cRead.status() !== 404) throw new Error("第三人不應能開啟別人的對話");
  step("第三人打不開別人的對話（404）");

  // 只接受好友私訊、封鎖
  await a.page.goto(`${BASE}/settings`);
  await a.page.check('input[name="dm_friends_only"]');
  await a.page.getByRole("button", { name: "儲存", exact: true }).click();
  await see(a.page, "已儲存");
  await c.page.goto(`${BASE}/messages/new?to=${a.id}`);
  await c.page.getByLabel("訊息").fill("你好");
  await c.page.getByRole("button", { name: "傳送", exact: true }).click();
  await see(c.page, "對方只接受好友的私訊");
  step("設定「只接受好友私訊」後，非好友被擋");
  await a.page.goto(`${BASE}/u/${b.id}`);
  await a.page.getByRole("button", { name: "封鎖", exact: true }).click();
  await see(a.page, "你已封鎖這位會員");
  await b.page.getByLabel("訊息").fill("在嗎");
  await b.page.getByRole("button", { name: "傳送", exact: true }).click();
  await see(b.page, "無法傳送訊息給這位會員");
  if (sql(`select count(*) from public.friendships where requester_id in ('${a.id}','${b.id}')`) !== "0") throw new Error("封鎖後應解除好友");
  step("封鎖後：無法傳訊、自動解除好友");
  console.log("social.mjs 全部通過");
} finally {
  await browser.close();
  cleanup();
}
