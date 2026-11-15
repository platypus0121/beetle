export const SITE_NAME = "台灣甲蟲論壇1.0";
export const SITE_DESC = "台灣的甲蟲同好社群：鍬形蟲、兜蟲、獨角仙、金龜的飼育討論、飼育紀錄、買賣與拍賣，還有全台甲蟲店名錄。";

export const FAMILY_GROUPS = { stag: "鍬形蟲", rhino: "兜蟲", scarab: "金龜" } as const;
export const POST_CATEGORIES = {
  breeding: "飼育",
  share: "分享",
  question: "問題",
  field: "採集",
  beginner: "新手",
  specimen: "標本",
} as const;
export const STAGES = {
  adult: "成蟲",
  larva: "幼蟲",
  pupa: "蛹",
  egg: "卵",
  specimen: "標本",
  supply: "用品",
} as const;
export const LIVE_STAGES = ["adult", "larva", "pupa", "egg"];
export const SEXES = { male: "♂ 公", female: "♀ 母", pair: "一對", unknown: "不明" } as const;
export const SHIPPING = {
  blackcat: "黑貓宅急便",
  post: "郵局",
  store: "超商店到店",
  meetup: "面交",
  other: "其他",
} as const;
export const LISTING_STATUS = {
  active: "上架中",
  reserved: "交易中",
  sold: "已售出",
  closed: "已下架",
  hidden: "已被隱藏",
} as const;
export const ORDER_STATUS = {
  requested: "待賣家確認",
  awaiting_payment: "待付款",
  payment_reported: "已回報付款",
  paid: "已付款",
  shipped: "已出貨",
  completed: "完成",
  disputed: "糾紛處理中",
  cancelled: "已取消",
} as const;
export const ORDER_STEPS = ["awaiting_payment", "paid", "shipped", "completed"] as const;
export const REPORT_REASONS = {
  spam: "廣告或洗版",
  scam: "疑似詐騙",
  protected: "保育類或違法交易",
  abuse: "謾罵或騷擾",
  wrong_info: "資訊有誤",
  closed: "店家已歇業",
  other: "其他",
} as const;
export const SPECIMEN_STAGES = { egg: "卵", larva: "幼蟲", pupa: "蛹", adult: "成蟲", dead: "已死亡" } as const;
export const EVENT_TYPES = {
  hatch: "孵化",
  molt: "蛻皮",
  pupate: "化蛹",
  emerge: "羽化",
  feed_start: "開始進食",
  pairing: "配對",
  oviposition: "產卵",
  death: "死亡",
  other: "其他",
} as const;
export const NOTIFICATION_TYPES = {
  comment: "文章有新留言",
  reply: "留言被回覆",
  mention: "被 @ 提及",
  like: "文章被按讚",
  follow: "有人追蹤你",
  friend: "好友邀請",
  message: "新私訊",
  order: "交易單進度",
  auction: "拍賣出價與結標",
  review: "收到評價",
  breeding: "換瓶提醒",
  report: "檢舉與提報結果",
  moderation: "站方處置",
} as const;
export const CITIES = [
  "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣", "臺中市", "彰化縣", "南投縣",
  "雲林縣", "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣",
  "澎湖縣", "金門縣", "連江縣",
];

// 媒體限制（前端檢查用；後端另有 Storage 與資料庫強制）
export const LIMITS = {
  postImages: 10,
  listingImages: 8,
  commentImages: 2,
  specimenImages: 20,
  imageMaxEdge: 2048,
  imageTargetBytes: 500 * 1024,
  imageMaxBytes: 1572864,
  videoMaxSeconds: 60,
  videoMaxBytes: 100 * 1024 * 1024,
  doaVideoMaxSeconds: 180,
  doaVideoMaxBytes: 250 * 1024 * 1024,
};

export type Key<T> = keyof T & string;
