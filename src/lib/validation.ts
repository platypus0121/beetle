import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "暱稱至少 2 個字")
  .max(20, "暱稱最多 20 個字")
  .regex(/^[^\s@/\\<>]+$/, "暱稱不可包含空白或 @ / \\ < > 符號");

export const emailSchema = z.string().trim().email("Email 格式不正確").max(200);
export const passwordSchema = z.string().min(8, "密碼至少 8 個字元").max(72);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
const optionalId = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0), "品種不正確");
const idList = z.array(z.coerce.number().int().positive()).max(20).default([]);

export const postSchema = z.object({
  category: z.enum(["breeding", "share", "question", "field", "beginner", "specimen"]),
  species_id: optionalId,
  title: z.string().trim().min(2, "標題至少 2 個字").max(80, "標題最多 80 個字"),
  body: z.string().trim().min(1, "請輸入內容").max(10000, "內容最多 10000 字"),
  youtube: z.string().trim().max(200).optional().default(""),
  status: z.enum(["draft", "published"]).default("published"),
  media_ids: idList,
  video_upload_id: z.coerce.number().int().positive().nullable().optional(),
});

export const commentSchema = z.object({
  post_id: z.coerce.number().int().positive(),
  parent_id: z.coerce.number().int().positive().nullable().optional(),
  body: z.string().trim().min(1, "請輸入留言").max(2000, "留言最多 2000 字"),
  media_ids: idList,
});

export const listingSchema = z
  .object({
    sale_type: z.enum(["fixed", "auction"]),
    species_id: optionalId,
    title: z.string().trim().min(2, "標題至少 2 個字").max(80),
    description: z.string().trim().max(5000).default(""),
    origin: optionalText(60),
    origin_is_taiwan: z.coerce.boolean().default(false),
    generation: optionalText(20),
    emerged_on: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
    size_mm: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((v) => (v === "" || v == null ? null : Number(v)))
      .refine((v) => v === null || (v > 0 && v < 250), "尺寸需介於 0–250 mm"),
    sex: z.enum(["male", "female", "pair", "unknown"]).default("unknown"),
    stage: z.enum(["adult", "larva", "pupa", "egg", "specimen", "supply"]),
    price: z.coerce.number().int("價格需為整數").min(1, "請輸入價格").max(10_000_000),
    shipping_methods: z.array(z.enum(["blackcat", "post", "store", "meetup", "other"])).min(1, "請至少選一種寄送方式"),
    city: optionalText(10),
    breeding_proof_path: optionalText(300),
    media_ids: idList,
    video_upload_id: z.coerce.number().int().positive().nullable().optional(),
    agreed: z.literal(true, { message: "請先閱讀並勾選交易注意事項" }),
    // 拍賣
    min_increment: z.coerce.number().int().min(1).max(1_000_000).optional(),
    ends_at: z.string().optional(),
    buy_now_price: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((v) => (v === "" || v == null ? null : Number(v))),
    reserve_price: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((v) => (v === "" || v == null ? null : Number(v))),
  })
  .superRefine((v, ctx) => {
    if (v.stage !== "supply" && v.species_id === null)
      ctx.addIssue({ code: "custom", path: ["species_id"], message: "請選擇品種" });
    if (v.sale_type === "auction") {
      if (!v.min_increment) ctx.addIssue({ code: "custom", path: ["min_increment"], message: "請輸入每次最低加價" });
      if (!v.ends_at || Number.isNaN(Date.parse(v.ends_at)))
        ctx.addIssue({ code: "custom", path: ["ends_at"], message: "請選擇結標時間" });
    }
  });

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "輸入內容有誤";
}

/** 第一個錯誤的欄位名稱，讓表單能捲過去並在欄位旁顯示。 */
export function firstField(e: z.ZodError): string | undefined {
  const k = e.issues[0]?.path[0];
  return typeof k === "string" ? k : undefined;
}
