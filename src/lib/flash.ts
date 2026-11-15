import "server-only";
import { cookies } from "next/headers";

// 跨頁提示：Server Action 成功後設一個 10 秒的 cookie，redirect 到下一頁時由 <Toaster> 讀出顯示並清除。
// 只放固定的提示文字（例如「已發布」），不放任何個資。不設 httpOnly，前端才讀得到。
export async function setFlash(message: string) {
  (await cookies()).set("flash", encodeURIComponent(message), { path: "/", maxAge: 10, sameSite: "lax" });
}
