-- 甲蟲店名錄更新（查證日期 2026-11-15）。
-- 原有店家：依店家官網重新確認，補上電話、地址與營業時間。
-- 新增店家：只收有近期營業證據（店家社群貼文或 2026 年媒體報導）的店。
-- 只出現在黃頁或整理文章、查不到近期營業證據的店，一律不收錄。

-- 阿文蟲坊：官網列出營業時間與電話（2026/11 仍有到貨公告）
update public.shops set phone = '0983-231-968',
  hours_note = '官網標示週一、週日公休；連假與臨時調整請留意官網公告',
  last_verified_on = '2026-11-15'
 where name = '阿文蟲坊昆蟲生態工作室';

-- 兜長的鍬大：官網列出兩店電話（2026 年仍有課程公告）
update public.shops set last_verified_on = '2026-11-15' where name = '兜長的鍬大 淡水店';
update public.shops set phone = '02-2960-4994', last_verified_on = '2026-11-15' where name = '兜長的鍬大 板橋店';

-- 玩甲蟲生態館：官網列出地址與營業時間
update public.shops set address = '臺中市西屯區西屯路三段79-12號',
  opening_hours = '{"mon":[],"tue":[["16:00","21:00"]],"wed":[["16:00","21:00"]],"thu":[["16:00","21:00"]],"fri":[["16:00","21:00"]],"sat":[["14:00","21:00"]],"sun":[["14:00","21:00"]]}',
  hours_note = '週一公休', last_verified_on = '2026-11-15'
 where name = '玩甲蟲生態館 One Beetle';

-- 甲蟲部落：店家 Instagram 標示週一、週二公休
update public.shops set
  opening_hours = '{"mon":[],"tue":[],"wed":[["16:00","21:00"]],"thu":[["16:00","21:00"]],"fri":[["16:00","21:00"]],"sat":[["14:00","21:00"]],"sun":[["14:00","21:00"]]}',
  hours_note = '依店家 Instagram：週一、週二公休', last_verified_on = '2026-11-15'
 where name = '甲蟲部落昆蟲生態館 文心森林店';

-- 來點甲蟲：官網仍標示週二至週五 15:00–21:00
update public.shops set last_verified_on = '2026-11-15' where name = '來點甲蟲 昆蟲生態館';

-- 峰甲蟲：補電話與官方連結頁；營業日每月公告
update public.shops set phone = '0909-930-065', website = 'https://portaly.cc/crazybeetles',
  hours_note = '營業日每月公告，前往前請先看店家公告', last_verified_on = '2026-11-15'
 where name = '峰甲蟲工作室 CrazyBeetles';

-- 新增
insert into public.shops (name, city, district, address, phone, opening_hours, hours_note, website, facebook, instagram, items, source_url, last_verified_on) values
('昆蟲哲學甲蟲生態館', '高雄市', '左營區', '高雄市左營區民族一路1103號', '0977-303-698',
 '{"mon":[],"tue":[["15:00","21:00"]],"wed":[["15:00","21:00"]],"thu":[["15:00","21:00"]],"fri":[["15:00","21:00"]],"sat":[["13:00","21:00"]],"sun":[["13:00","21:00"]]}',
 '週一公休', null, null, 'https://www.threads.com/@philosophy_of_insects', '甲蟲與爬蟲活體',
 'https://www.threads.com/@philosophy_of_insects', '2026-11-15'),
('屏東甲蟲世界', '屏東縣', '長治鄉', '屏東縣長治鄉進興村進興巷111之3號', '0982-525-074',
 '{"mon":[["15:00","21:00"]],"tue":[["15:00","21:00"]],"wed":[],"thu":[["15:00","21:00"]],"fri":[["15:00","21:00"]],"sat":[["12:00","21:00"]],"sun":[["12:00","21:00"]]}',
 '每週三固定公休', null, null, 'https://www.threads.com/@pt_beetles', '兜蟲、鍬形蟲、自製發酵木屑與兜蟲土',
 'https://www.threads.com/@pt_beetles', '2026-11-15'),
('映賽恪特甲蟲 總店', '臺南市', '東區', '臺南市東區中華東路一段80巷11弄2號', '0927-199-103',
 '{"mon":[["13:00","21:00"]],"tue":[["13:00","21:00"]],"wed":[["13:00","21:00"]],"thu":[["13:00","21:00"]],"fri":[["13:00","18:00"]],"sat":[["13:00","21:00"]],"sun":[["13:00","18:00"]]}',
 '依 2026 年 4 月媒體報導；臨時休息請看店家 Instagram', null, null, 'https://www.instagram.com/insec_tw/', '甲蟲與爬蟲活體、飼育用品',
 'https://news.pchome.com.tw/living/lifetoutiao/20260416/index-77630335041375315009.html', '2026-11-15'),
('映賽恪特甲蟲 逐水草而居店', '臺南市', '北區', '臺南市北區育德一街35號', '0927-199-103',
 '{"mon":[],"tue":[["16:30","22:00"]],"wed":[["16:30","22:00"]],"thu":[],"fri":[["16:30","22:00"]],"sat":[["16:30","22:00"]],"sun":[["16:30","22:00"]]}',
 '週一、週四公休（依 2026 年 4 月媒體報導）', null, null, 'https://www.instagram.com/insec_tw/', '甲蟲與爬蟲活體、飼育用品',
 'https://news.pchome.com.tw/living/lifetoutiao/20260416/index-77630335041375315009.html', '2026-11-15');
