-- 依農業部 114 年 2 月 7 日修正之〈陸域保育類野生動物名錄〉核對（法規網 law.moa.gov.tw，GL000556）。
-- 名錄中屬於本站物種範圍（鍬形蟲科、金龜子科）的保育類只有三種，已全部標記：
--   臺灣大鍬形蟲 Dorcus curvidens formosanus（III）、長角大鍬形蟲 Dorcus schenklingi（II）、
--   臺灣長臂金龜 Cheirotonus formosanus（III）。
-- 這裡把學名改成名錄寫法，舊學名與異名放進 aliases，搜尋舊名仍找得到。

update public.species
   set scientific_name = 'Dorcus curvidens formosanus',
       aliases = trim(aliases || ' Dorcus grandis formosanus Dorcus formosanus Dorcus hopei formosanus 台灣大鍬形蟲 臺灣大鍬')
 where scientific_name = 'Dorcus grandis formosanus';

update public.species
   set aliases = trim(aliases || ' Cheirotonus macleayi 長臂金龜 台灣長臂金龜')
 where scientific_name = 'Cheirotonus formosanus' and aliases not like '%macleayi%';

update public.species
   set aliases = trim(aliases || ' 台灣長角大鍬')
 where scientific_name = 'Dorcus schenklingi' and aliases not like '%台灣長角大鍬%';

-- 保險：名錄的三種一定是保育類
update public.species set is_protected = true
 where scientific_name in ('Dorcus curvidens formosanus', 'Dorcus schenklingi', 'Cheirotonus formosanus');
