import { BASE, cleanup, launch, newUser, shot, sql, step, testImage } from "./helpers.mjs";

cleanup();
const browser = await launch();
const expectText = async (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });
try {
  const seller = await newUser(browser, "e2eSeller");
  const buyer = await newUser(browser, "e2eBuyer");
  const buyer2 = await newUser(browser, "e2eBuyer2");
  const png = await testImage(browser);
  const s = seller.page, b = buyer.page, b2 = buyer2.page;

  // ── 保育類在表單就擋下 ──
  await s.goto(`${BASE}/market/new`);
  await s.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("台灣大鍬");
  await s.getByRole("button", { name: /臺灣大鍬形蟲/ }).click();
  await expectText(s, "依《野生動物保育法》不得買賣");
  if (!(await s.getByRole("button", { name: "上架", exact: true }).isDisabled())) throw new Error("保育類應停用送出鈕");
  await shot(s, "10-protected-blocked");
  step("選到保育類：顯示說明並停用上架鈕");

  // ── 台灣產活體需飼育證明 ──
  await s.getByRole("button", { name: "更換" }).click();
  await s.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("獨角仙");
  await s.getByRole("button", { name: /^獨角仙/ }).click();
  await s.selectOption("#stage", "larva");
  await s.check('input[name="origin_is_taiwan"]');
  await expectText(s, "台灣產活體需附飼育證明");
  if (!(await s.getByRole("button", { name: "上架", exact: true }).isDisabled())) throw new Error("缺飼育證明應停用送出鈕");
  step("台灣產活體未附飼育證明：停用上架鈕");
  await s.setInputFiles('input[type="file"][accept="image/*"] >> nth=0', [{ name: "proof.png", mimeType: "image/png", buffer: png }]);
  await expectText(s, "✓ 已上傳");
  await s.fill("#title", "獨角仙三齡幼蟲 累代繁殖");
  await s.fill("#price", "150");
  await s.getByText("超商店到店", { exact: true }).click();
  await s.check('input[name="agreed"]');
  await s.getByRole("button", { name: "上架", exact: true }).click();
  await s.waitForURL(/\/market\/\d+$/);
  await expectText(s, "已附飼育證明");
  step("附上飼育證明後成功上架，商品頁顯示標章");

  // ── 直購上架 ──
  await s.goto(`${BASE}/market/new`);
  await s.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("Dynastes hercules");
  await s.getByRole("button", { name: /長戟大兜蟲/ }).click();
  await s.fill("#title", "DHH 長戟大兜蟲 ♂145mm");
  await s.selectOption("#sex", "male");
  await s.fill("#size_mm", "145");
  await s.fill("#generation", "CBF2");
  await s.fill("#origin", "Guadeloupe");
  await s.fill("#emerged_on", "2026-08-01");
  await s.fill("#price", "8000");
  await s.getByText("黑貓宅急便", { exact: true }).click();
  await s.getByText("面交", { exact: true }).click();
  await s.fill("#description", "無瑕疵，已後食。");
  await s.setInputFiles('input[type="file"][accept="image/*"] >> nth=0', [{ name: "a.png", mimeType: "image/png", buffer: png }]);
  await s.waitForSelector('input[name="media_ids"]', { state: "attached", timeout: 30000 });
  await s.check('input[name="agreed"]');
  await shot(s, "11-listing-form");
  await s.getByRole("button", { name: "上架", exact: true }).click();
  await s.waitForURL(/\/market\/\d+$/);
  const listingId = Number(s.url().split("/").pop());
  step("直購上架（學名、產地、累代、羽化日、尺寸、價格、寄送方式）");
  if (sql(`select scientific_name from public.listings where id = ${listingId}`) !== "Dynastes hercules hercules") throw new Error("學名未帶入");

  await b.goto(`${BASE}/market`);
  await expectText(b, "DHH 長戟大兜蟲");
  await shot(b, "12-market-list");
  await b.goto(`${BASE}/market?group=rhino&stage=adult&min=5000&ship=meetup`);
  await expectText(b, "DHH 長戟大兜蟲");
  await b.goto(`${BASE}/market?group=stag`);
  if (await b.getByText("DHH 長戟大兜蟲").count()) throw new Error("分類篩選無效");
  step("交易列表與篩選（分類、類型、價格、寄送方式）");

  // ── 下單 → 收款資訊 → 付款回報 → 確認 → 出貨 → 完成 → 互評 ──
  await b.goto(`${BASE}/market/${listingId}`);
  await shot(b, "13-listing-detail");
  await b.fill('textarea[name="note"]', "請加保冷");
  await b.check('input[name="agreed"]');
  await b.getByRole("button", { name: "我要購買" }).click();
  await b.waitForURL(/\/orders\/\d+$/);
  const orderId = Number(b.url().split("/").pop());
  await expectText(b, "等待賣家確認");
  step("買家下單，建立交易單");

  await s.goto(`${BASE}/orders/${orderId}`);
  await s.fill('input[name="bank_code"]', "822");
  await s.fill('input[name="account_no"]', "123456789012");
  await s.fill('input[name="account_name"]', "測試賣家");
  await s.check('input[name="save"]');
  await s.getByRole("button", { name: "送出收款資訊" }).click();
  await expectText(s, "收款資訊已更新");
  await s.getByRole("button", { name: "接受訂單" }).click();
  await expectText(s, "等待買家付款");
  step("賣家在交易單填收款帳戶並接受");

  await b2.goto(`${BASE}/orders/${orderId}`);
  if (!(await b2.getByText(/404|找不到/).count()) && (await b2.getByText("123456789012").count())) throw new Error("第三人看得到收款帳戶！");
  step("第三人打不開別人的交易單");

  await b.reload();
  await expectText(b, "123456789012");
  await shot(b, "14-order-awaiting-payment");
  await b.fill("#last5", "54321");
  await b.setInputFiles('input[type="file"]', [{ name: "pay.png", mimeType: "image/png", buffer: png }]);
  await expectText(b, "✓ 已上傳");
  await b.getByRole("button", { name: "回報已付款" }).click();
  await expectText(b, "等待賣家確認");
  step("買家在交易單看到帳戶，回報付款（金額、末五碼、截圖）");

  s.on("dialog", (d) => d.accept());
  b.on("dialog", (d) => d.accept());
  await s.reload();
  await expectText(s, "查看轉帳截圖");
  await s.getByRole("button", { name: "確認已收到款項" }).click();
  await expectText(s, "請出貨");
  await s.fill('input[name="tracking_no"]', "906123456789");
  await s.getByRole("button", { name: "已出貨" }).click();
  await expectText(s, "等待買家確認收貨");
  step("賣家確認收款、出貨並填物流單號");

  await b.reload();
  await expectText(b, "906123456789");
  await b.getByRole("button", { name: "確認收貨，完成交易" }).click();
  await expectText(b, "交易完成");
  await b.getByRole("link", { name: "評價賣家" }).click();
  await b.fill('textarea[name="body"]', "包裝仔細，個體漂亮");
  await b.getByRole("button", { name: "送出評價" }).click();
  await b.waitForURL(new RegExp(`/orders/${orderId}$`));
  await shot(b, "15-order-completed");
  await s.reload();
  await s.getByRole("link", { name: "評價買家" }).click();
  await s.getByRole("radio", { name: "4 星" }).click();
  await s.getByRole("button", { name: "送出評價" }).click();
  await s.waitForURL(new RegExp(`/orders/${orderId}$`));
  step("買家確認收貨，雙方互評");
  const tl = sql(`select string_agg(action, '>' order by id) from public.order_events where order_id = ${orderId}`);
  if (tl !== "create>set_payment_info>accept>report_payment>confirm_payment>ship>confirm_receipt") throw new Error("時間軸不符：" + tl);
  step("時間軸完整：" + tl);
  const sc = sql(`select credit_score || '/' || completed_orders from public.profiles where id = '${seller.id}'`);
  if (sc !== "102/1") throw new Error("賣家信用分不符 " + sc);
  step("賣家信用分 102（完成 +1、好評 +1）、完成交易 1");

  // ── 拍賣 ──
  await s.goto(`${BASE}/market/new`);
  await s.getByText("拍賣", { exact: true }).click();
  await s.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("彩虹");
  await s.getByRole("button", { name: /彩虹鍬形蟲/ }).click();
  await s.fill("#title", "彩虹鍬 紅系 ♂62mm 拍賣");
  await s.fill("#price", "1000");
  await s.fill("#min_increment", "100");
  await s.fill("#reserve_price", "1500");
  await s.getByText("黑貓宅急便", { exact: true }).click();
  await s.check('input[name="agreed"]');
  await s.getByRole("button", { name: "開始拍賣" }).click();
  await s.waitForURL(/\/market\/\d+$/);
  const auctionId = Number(s.url().split("/").pop());
  step("賣家開始拍賣（起標 1000、每口 100、底價 1500）");

  await b.goto(`${BASE}/market/${auctionId}`);
  await b.fill("#amount", "2000");
  await b.check('input[name="agreed"]');
  await b.getByRole("button", { name: "出價", exact: true }).click();
  await expectText(b, "出價成功，你目前領先");
  await b2.goto(`${BASE}/market/${auctionId}`);
  await b2.fill("#amount", "1300");
  await b2.check('input[name="agreed"]');
  await b2.getByRole("button", { name: "出價", exact: true }).click();
  await expectText(b2, "你被超過了");
  // 即時更新：b 的畫面不重新整理就應看到新價格
  await b.getByText("NT$1,400").first().waitFor({ timeout: 15000 });
  step("兩人競標：自動出價代為加價到 1,400，另一人的畫面即時更新");
  await b2.fill("#amount", "2500");
  await b2.check('input[name="agreed"]');
  await b2.getByRole("button", { name: "出價", exact: true }).click();
  await expectText(b2, "出價成功，你目前領先");
  await shot(b2, "16-auction");
  const n = sql(`select count(*) from public.notifications where user_id = '${buyer.id}' and type = 'auction'`);
  if (n !== "1") throw new Error("被超標通知數不符 " + n);
  step("超過對方上限後領先（2,100），被超過的人收到通知");

  // 延標：把結標時間調到 2 分鐘後再出價
  sql(`update public.auctions set ends_at = now() + interval '2 minutes' where listing_id = ${auctionId}`);
  await b.reload();
  await b.fill("#amount", "2300");
  await b.check('input[name="agreed"]');
  await b.getByRole("button", { name: "出價", exact: true }).click();
  await expectText(b, "結標時間已延長 5 分鐘");
  step("結標前 5 分鐘內出價 → 自動延長 5 分鐘");

  // 結標：調成已到期，等排程（每分鐘）處理
  sql(`update public.auctions set ends_at = now() - interval '1 second' where listing_id = ${auctionId}`);
  let wonOrder = "";
  for (let i = 0; i < 16 && !wonOrder; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    wonOrder = sql(`select id from public.orders where listing_id = ${auctionId}`);
  }
  if (!wonOrder) throw new Error("排程沒有在 80 秒內結標");
  const won = sql(`select status || '/' || amount || '/' || (buyer_id = '${buyer2.id}') from public.orders where id = ${wonOrder}`);
  if (won !== "awaiting_payment/2400/true") throw new Error("得標交易單不符 " + won);
  step("排程自動結標：最高出價者以 2,400 得標，成立待付款交易單");
  await b2.goto(`${BASE}/orders/${wonOrder}`);
  await expectText(b2, "賣家尚未提供收款資訊");
  await b2.goto(`${BASE}/notifications`).catch(() => {});
  console.log("market.mjs 全部通過");
} finally {
  await browser.close();
  cleanup();
}
