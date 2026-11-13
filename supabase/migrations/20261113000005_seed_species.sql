-- 0005 物種種子資料。is_protected = true 者在 0003 的觸發器會擋下上架。
-- 保育類依《野生動物保育法》公告名錄；上線前請對照農業部最新公告。
insert into public.species (common_name, scientific_name, japanese_name, family_group, genus, is_protected, is_native_tw, aliases) values
-- 鍬形蟲
('臺灣大鍬形蟲','Dorcus grandis formosanus','タイワンオオクワガタ','stag','Dorcus',true,true,'台灣大鍬 臺灣大鍬 台灣大鍬形蟲'),
('長角大鍬形蟲','Dorcus schenklingi','シェンクリングオオクワガタ','stag','Dorcus',true,true,'長角大鍬 申克林'),
('日本大鍬形蟲','Dorcus hopei binodulosus','オオクワガタ','stag','Dorcus',false,false,'日本大鍬 國產大鍬 日大'),
('中國大鍬形蟲','Dorcus hopei hopei','ホペイオオクワガタ','stag','Dorcus',false,false,'中國大鍬 HOPEI 霍佩'),
('安達佑實大鍬形蟲','Dorcus antaeus','アンタエウスオオクワガタ','stag','Dorcus',false,false,'安達 安達大鍬'),
('巴拉望大扁鍬形蟲','Dorcus titanus palawanicus','パラワンオオヒラタクワガタ','stag','Dorcus',false,false,'巴拉望 巴拉望大扁'),
('蘇門答臘大扁鍬形蟲','Dorcus titanus yasuokai','スマトラオオヒラタクワガタ','stag','Dorcus',false,false,'蘇門答臘大扁 蘇門'),
('扁鍬形蟲','Dorcus titanus sika','タイワンヒラタクワガタ','stag','Dorcus',false,true,'台灣扁鍬 扁鍬'),
('刀鍬形蟲','Dorcus yamadai','ヤマダクワガタ','stag','Dorcus',false,true,'刀鍬'),
('鬼豔鍬形蟲','Odontolabis siva parryi','タイワンシバツヤクワガタ','stag','Odontolabis',false,true,'鬼艷 鬼豔'),
('長頸鹿鋸鍬形蟲','Prosopocoilus giraffa keisukei','ギラファノコギリクワガタ','stag','Prosopocoilus',false,false,'長頸鹿鋸 長頸鹿'),
('兩點鋸鍬形蟲','Prosopocoilus astacoides blanchardi','フタテンアカクワガタ','stag','Prosopocoilus',false,true,'兩點鋸 兩點赤'),
('高砂鋸鍬形蟲','Prosopocoilus motschulskii','タカサゴノコギリクワガタ','stag','Prosopocoilus',false,true,'高砂鋸'),
('日本鋸鍬形蟲','Prosopocoilus inclinatus','ノコギリクワガタ','stag','Prosopocoilus',false,false,'日本鋸 鋸鍬'),
('孔夫子鋸鍬形蟲','Prosopocoilus confucius','コンフキウスノコギリクワガタ','stag','Prosopocoilus',false,false,'孔夫子'),
('美他利佛細身赤鍬形蟲','Cyclommatus metallifer','メタリフェルホソアカクワガタ','stag','Cyclommatus',false,false,'美他利佛 美他'),
('雞冠細身赤鍬形蟲','Cyclommatus mniszechi','ムニスゼッチホソアカクワガタ','stag','Cyclommatus',false,true,'雞冠細身赤 雞冠'),
('彩虹鍬形蟲','Phalacrognathus muelleri','ニジイロクワガタ','stag','Phalacrognathus',false,false,'彩虹鍬 彩虹'),
('羅森伯基黃金鬼鍬形蟲','Allotopus rosenbergi','ローゼンベルグオウゴンオニクワガタ','stag','Allotopus',false,false,'黃金鬼 羅森黃金鬼'),
('莫瑟里黃金鬼鍬形蟲','Allotopus moellenkampi moseri','モセリオウゴンオニクワガタ','stag','Allotopus',false,false,'莫瑟里 黃金鬼'),
('塔蘭多斯大黑豔鍬形蟲','Mesotopus tarandus','タランドゥスオオツヤクワガタ','stag','Mesotopus',false,false,'塔蘭多斯 塔蘭 大黑艷'),
('歐洲深山鍬形蟲','Lucanus cervus','ヨーロッパミヤマクワガタ','stag','Lucanus',false,false,'歐洲深山 歐深'),
('日本深山鍬形蟲','Lucanus maculifemoratus','ミヤマクワガタ','stag','Lucanus',false,false,'日本深山'),
('高砂深山鍬形蟲','Lucanus formosanus','タイワンミヤマクワガタ','stag','Lucanus',false,true,'高砂深山 台灣深山'),
('姬深山鍬形蟲','Lucanus swinhoei','スウィンホーミヤマクワガタ','stag','Lucanus',false,true,'姬深山'),
('鹿角鍬形蟲','Rhaetulus crenatus','タイワンシカクワガタ','stag','Rhaetulus',false,true,'鹿角鍬'),
('橘背叉角鍬形蟲','Hexarthrius parryi','パリーフタマタクワガタ','stag','Hexarthrius',false,false,'橘背叉角 橘背'),
('曼迪布拉叉角鍬形蟲','Hexarthrius mandibularis','マンディブラリスフタマタクワガタ','stag','Hexarthrius',false,false,'曼迪 曼迪布拉'),
('智利長牙鍬形蟲','Chiasognathus grantii','チリクワガタ','stag','Chiasognathus',false,false,'智利長牙 達爾文鍬形蟲'),
-- 兜蟲
('獨角仙','Trypoxylus dichotomus tunobosonis','タイワンカブトムシ','rhino','Trypoxylus',false,true,'台灣獨角仙 雞母蟲 兜蟲'),
('日本獨角仙','Trypoxylus dichotomus septentrionalis','カブトムシ','rhino','Trypoxylus',false,false,'日本兜蟲 國產兜'),
('長戟大兜蟲','Dynastes hercules hercules','ヘラクレスオオカブト','rhino','Dynastes',false,false,'赫克力士 海克力斯 DHH 長戟'),
('海神大兜蟲','Dynastes neptunus','ネプチューンオオカブト','rhino','Dynastes',false,false,'海神 尼普頓'),
('撒旦大兜蟲','Dynastes satanas','サタンオオカブト','rhino','Dynastes',false,false,'撒旦'),
('格蘭特白兜蟲','Dynastes grantii','グラントシロカブト','rhino','Dynastes',false,false,'美西白兜 格蘭特白兜 白兜'),
('泰坦白兜蟲','Dynastes tityus','ティティウスシロカブト','rhino','Dynastes',false,false,'美東白兜 提提烏斯'),
('高卡薩斯南洋大兜蟲','Chalcosoma chiron','コーカサスオオカブト','rhino','Chalcosoma',false,false,'高卡薩斯 高卡 Chalcosoma caucasus'),
('亞特拉斯南洋大兜蟲','Chalcosoma atlas','アトラスオオカブト','rhino','Chalcosoma',false,false,'亞特拉斯'),
('毛象大兜蟲','Megasoma elephas','エレファスゾウカブト','rhino','Megasoma',false,false,'毛象 象兜'),
('戰神大兜蟲','Megasoma mars','マルスゾウカブト','rhino','Megasoma',false,false,'戰神 馬爾斯'),
('亞克提恩大兜蟲','Megasoma actaeon','アクティオンゾウカブト','rhino','Megasoma',false,false,'亞克提恩'),
('細角疣犀金龜','Eupatorus gracilicornis','ゴホンヅノカブト','rhino','Eupatorus',false,false,'五角大兜蟲 五角兜'),
('姬兜蟲','Xylotrupes gideon','ヒメカブト','rhino','Xylotrupes',false,false,'姬兜'),
('犀角金龜','Oryctes rhinoceros','サイカブト','rhino','Oryctes',false,true,'椰子犀角金龜'),
-- 金龜（花金龜、長臂金龜）
('臺灣長臂金龜','Cheirotonus formosanus','タイワンテナガコガネ','scarab','Cheirotonus',true,true,'台灣長臂金龜 長臂金龜'),
('大王花金龜','Goliathus goliatus','ゴライアスオオツノハナムグリ','scarab','Goliathus',false,false,'大王花金龜 歌利亞'),
('白紋大王花金龜','Goliathus orientalis','オリエンタリスオオツノハナムグリ','scarab','Goliathus',false,false,'東方大王花金龜'),
('烏干達大角花金龜','Mecynorhina torquata ugandensis','ウガンデンシスオオツノカナブン','scarab','Mecynorhina',false,false,'烏干達花金龜 烏干達'),
('波麗菲夢斯大角花金龜','Mecynorhina polyphemus','ポリフェムスオオツノカナブン','scarab','Mecynorhina',false,false,'波麗菲夢斯 波麗'),
('東方白點花金龜','Protaetia orientalis','シロテンハナムグリ','scarab','Protaetia',false,true,'白點花金龜'),
('臺灣角金龜','Dicranocephalus bourgoini',null,'scarab','Dicranocephalus',false,true,'台灣角金龜 鹿角金龜'),
('金豔騷金龜','Rhomborhina splendida',null,'scarab','Rhomborhina',false,true,'金艷騷金龜')
on conflict (scientific_name) do nothing;

insert into public.banned_words (word) values
  ('娛樂城'),('博弈'),('百家樂'),('線上賭場'),('小額借款'),('借貸免審'),('代辦貸款'),
  ('威而鋼'),('外送茶'),('兼職月入'),('加賴賺錢'),('精品代購A貨')
on conflict do nothing;
