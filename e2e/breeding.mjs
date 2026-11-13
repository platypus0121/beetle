import { BASE, cleanup, launch, newUser, shot, sql, step } from "./helpers.mjs";

cleanup();
const browser = await launch();
const see = async (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });
try {
  const a = await newUser(browser, "e2eKeeper");
  const b = await newUser(browser, "e2eViewer");
  const p = a.page;
  async function create(label, sex, sire) {
    await p.goto(`${BASE}/breeding/new`);
    await p.fill("#label", label);
    await p.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("オオクワガタ");
    await p.getByRole("button", { name: /日本大鍬形蟲/ }).click();
    await p.selectOption("#sex", sex);
    await p.fill("#bloodline_name", "能勢 YG");
    if (sire) await p.selectOption("#sire_id", { label: sire });
    await p.getByRole("button", { name: "建立個體" }).click();
    await p.waitForURL(/\/breeding\/\d+$/);
    return Number(p.url().split("/").pop());
  }
  const sireId = await create("YG-父-01", "male");
  const kidId = await create("YG-2026-07", "male", "YG-父-01");
  step("建立親蟲與子代（指定父本）");

  for (const [d, w, h] of [["2026-06-01", "8.5", "9.1"], ["2026-08-01", "21.3", "11.8"], ["2026-10-01", "30.2", "12.4"]]) {
    await p.getByText("＋ 新增量測").click();
    await p.fill('form:has(input[name="kind"][value="measurement"]) input[name="on"]', d);
    await p.fill('input[name="weight_g"]', w);
    await p.fill('input[name="head_width_mm"]', h);
    await p.locator('form:has(input[name="kind"][value="measurement"])').getByRole("button", { name: "儲存" }).click();
    await see(p, w);
    await p.getByText("＋ 新增量測").click();
  }
  await see(p, "最新 30.2 g");
  step("新增 3 筆體重／頭幅量測，畫出成長曲線");

  await p.getByText("＋ 新增換瓶").click();
  await p.fill('form:has(input[name="kind"][value="bottle"]) input[name="on"]', "2026-08-01");
  await p.fill('input[name="substrate"]', "雲芝菌瓶");
  await p.fill('input[name="volume_ml"]', "1400");
  await p.fill('input[name="next_due_on"]', "2026-11-01");
  await p.locator('form:has(input[name="kind"][value="bottle"])').getByRole("button", { name: "儲存" }).click();
  await see(p, "雲芝菌瓶");
  sql("select private.run_maintenance()");
  if (sql(`select count(*) from public.notifications where user_id = '${a.id}' and type = 'breeding'`) !== "1") throw new Error("沒有換瓶提醒");
  sql("select private.run_maintenance()");
  if (sql(`select count(*) from public.notifications where user_id = '${a.id}' and type = 'breeding'`) !== "1") throw new Error("換瓶提醒重複發送");
  step("換瓶紀錄；到期後排程發出換瓶提醒（只發一次）");

  await p.getByText("＋ 新增事件").click();
  await p.selectOption('select[name="event_type"]', "emerge");
  await p.locator('form:has(input[name="kind"][value="event"])').getByRole("button", { name: "儲存" }).click();
  await see(p, "羽化日");
  if (sql(`select stage from public.specimens where id = ${kidId}`) !== "adult") throw new Error("羽化事件未更新階段");
  step("記錄羽化事件，個體階段自動改為成蟲");
  await see(p, "父本 ♂");
  await see(p, "YG-父-01");
  await p.evaluate(() => window.scrollTo(0, 500));
  await shot(p, "30-breeding-detail");

  const r1 = await b.page.goto(`${BASE}/breeding/${kidId}`);
  if (r1.status() !== 404) throw new Error("私人個體不應被別人看到");
  step("預設私人：其他會員打不開");
  await p.goto(`${BASE}/breeding/${kidId}/edit`);
  await p.getByText("公開", { exact: true }).click();
  await p.getByRole("button", { name: "儲存" }).click();
  await p.waitForURL(/\/breeding\/\d+$/);
  await b.page.goto(`${BASE}/breeding/${kidId}`);
  await see(b.page, "YG-2026-07");
  if (await b.page.getByText("＋ 新增量測").count()) throw new Error("訪客不應看到新增按鈕");
  if (await b.page.getByRole("link", { name: /YG-父-01/ }).count()) throw new Error("私人的父本不應顯示給別人");
  step("設為公開後別人可看，但不能編輯，也看不到仍為私人的父本");
  await p.goto(`${BASE}/breeding/${sireId}`);
  await see(p, "子代（1）");
  await p.goto(`${BASE}/market/new?specimen=${kidId}`);
  if ((await p.inputValue("#title")) !== "日本大鍬形蟲 YG-2026-07") throw new Error("帶入上架失敗");
  step("父本頁顯示子代；個體資料可一鍵帶入上架表單");

  await p.goto(`${BASE}/breeding/temperature`);
  for (const [d, t] of [["2026-11-10", "22.5"], ["2026-11-11", "23.1"], ["2026-11-12", "21.8"]]) {
    await p.fill('input[name="on"]', d);
    await p.fill('input[name="temp_c"]', t);
    await p.getByRole("button", { name: "記錄" }).click();
    await p.getByRole("cell", { name: t, exact: true }).waitFor();
  }
  await see(p, "每日平均溫度");
  await shot(p, "31-temperature");
  step("溫度紀錄與折線圖");
  console.log("breeding.mjs 全部通過");
} finally {
  await browser.close();
  cleanup();
}
