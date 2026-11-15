-- 甲蟲店「代客溫控寄養」查證結果（2026-11-15）。只有查得到店家官網或粉專說明的才標「有提供」，其餘維持「尚未確認」。
update public.shops set boarding = true,
  boarding_note = '「蟲蟲旅館」：冷氣房全年 22–24°C、24 小時監視器；限貝殼箱，使用店內耗材可免費溫控，名額有限（依官網）'
 where name = '來點甲蟲 昆蟲生態館';
update public.shops set boarding = true,
  boarding_note = '24 小時恆溫格位出租（依官網），費用請洽店家'
 where name = '阿文蟲坊昆蟲生態工作室';
update public.shops set boarding = true,
  boarding_note = '官網有「溫控租借」服務，適用門市與費用請洽店家'
 where name in ('兜長的鍬大 淡水店', '兜長的鍬大 板橋店');
update public.shops set boarding = true,
  boarding_note = '可租用溫控室（依店家粉專），費用請洽店家'
 where name = '屏東甲蟲世界';
