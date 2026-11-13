-- 0008 甲蟲店名錄種子資料。
-- 收錄原則：只收查得到店家官網或官方社群、且有近期營業跡象的店；查不清楚的營業時間留空（頁面顯示「請洽店家」）。
-- 查證日期 2026-11-13，依據為搜尋結果摘要中的官方頁面內容（未能逐一開啟原網頁），上線前請站方再確認一次。
insert into public.shops (name, city, district, address, phone, opening_hours, hours_note, website, facebook, instagram, items, source_url, last_verified_on) values
('阿文蟲坊昆蟲生態工作室', '臺北市', '文山區', '臺北市文山區羅斯福路五段136-1號B1室', null,
 '{"mon":[],"tue":[["13:00","20:00"]],"wed":[["13:00","20:00"]],"thu":[["13:00","20:00"]],"fri":[["13:00","20:00"]],"sat":[["10:00","17:00"]],"sun":[]}',
 '連假期間可能調整，請留意官網公告', 'https://awenbeetlehouse.com/', null, null, '國內外昆蟲活體、飼育用品', 'https://awenbeetlehouse.com/', '2026-11-13'),
('兜長的鍬大 淡水店', '新北市', '淡水區', '新北市淡水區淡金路二段515號', '0988-168-615',
 null, '官網建議先預約再前往', 'https://fantastic-beetles.com/', null, null, '大型兜蟲、鍬形蟲、菌瓶與耗材、課程', 'https://fantastic-beetles.com/', '2026-11-13'),
('兜長的鍬大 板橋店', '新北市', '板橋區', '新北市板橋區光華街20號', null,
 null, null, 'https://fantastic-beetles.com/', null, null, '大型兜蟲、鍬形蟲、菌瓶與耗材', 'https://fantastic-beetles.com/', '2026-11-13'),
('喜蟲天降甲蟲專賣店 新莊總店', '新北市', '新莊區', '新北市新莊區中正路437號', '02-2202-0291',
 null, '官網標示全年無休；各頁面寫的打烊時間不一致（下午 1 點開始，晚上 9 點或 10 點結束），請洽店家', 'https://www.beetles.com.tw/', null, null, '甲蟲活體、飼育用品批發零售', 'https://www.beetles.com.tw/readme.asp', '2026-11-13'),
('奇力貝舍甲蟲專賣店', '臺中市', '西屯區', '臺中市西屯區逢甲路19巷19號2樓-B1', '0975-295-505',
 '{"mon":[["14:00","23:00"]],"tue":[["14:00","23:00"]],"wed":[["14:00","23:00"]],"thu":[["14:00","23:00"]],"fri":[["14:00","23:00"]],"sat":[["14:00","23:00"]],"sun":[["14:00","23:00"]]}',
 '公休日另行公告，請留意店家社群', null, null, 'https://www.threads.com/@clbsbeetleshouse', '各國兜蟲、鍬形蟲成蟲與幼蟲', 'https://www.threads.com/@clbsbeetleshouse', '2026-11-13'),
('來點甲蟲 昆蟲生態館', '臺中市', '東區', '臺中市東區建成路720號', '04-2280-0329',
 null, '官網標示週二至週五 15:00–21:00；週末與週一請洽店家', 'https://www.laidianbeetle.com/', null, null, '活體成蟲與幼蟲、飼育用品、昆蟲生態課程', 'https://www.laidianbeetle.com/', '2026-11-13'),
('甲蟲部落昆蟲生態館 文心森林店', '臺中市', '南屯區', '臺中市南屯區向上南路一段341號', '04-2473-3139',
 null, '平日 16:00–21:00、假日 14:00–21:00；公休日有「週二」與「週一、週二」兩種說法，請洽店家', null, 'https://www.facebook.com/beetletribe/', 'https://www.instagram.com/beetle_tribe.ruten/', '甲蟲活體、飼育用品、親子體驗', 'https://www.facebook.com/beetletribe/', '2026-11-13'),
('玩甲蟲生態館 One Beetle', '臺中市', '西屯區', null, '04-2461-2229',
 null, null, 'https://www.one-beetle.com/', null, null, '甲蟲與爬蟲活體', 'https://www.one-beetle.com/', '2026-11-13'),
('峰甲蟲工作室 CrazyBeetles', '高雄市', '燕巢區', '高雄市燕巢區鳳旗路264號', null,
 '{"mon":[["19:00","22:00"]],"tue":[["19:00","22:00"]],"wed":[["19:00","22:00"]],"thu":[["19:00","22:00"]],"fri":[["19:00","22:00"]],"sat":[["12:00","20:00"]],"sun":[["12:00","20:00"]]}',
 '店休請見店家公告', null, null, null, '甲蟲與兜蟲培育', 'https://vocus.cc/salon/crazybeetles264/room/690c6f44cebbddbc5cbbbc1c', '2026-11-13');
