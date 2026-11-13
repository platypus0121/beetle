import type { Metadata } from "next";
import Link from "next/link";
import { Doc } from "@/components/Doc";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "站規", description: `${SITE_NAME}的使用規範：討論範圍、禁止事項、檢舉與處置方式。` };

export default function RulesPage() {
  return (
    <Doc title="站規" updated="2026/11/13">
      <h2>討論範圍</h2>
      <p>本站只討論鍬形蟲、兜蟲、金龜（含花金龜、長臂金龜）的飼育、繁殖、採集觀察、標本與相關用品。其他昆蟲、爬蟲等不在範圍內。</p>
      <h2>禁止事項</h2>
      <ul>
        <li>廣告、洗版、重複張貼、導流到站外賣場或群組。</li>
        <li>買賣或徵求保育類野生動物，或教唆、炫耀違法採集。</li>
        <li>詐騙、冒用他人身分、在私訊提供匯款帳號誘導私下交易。</li>
        <li>謾罵、人身攻擊、騷擾、公開他人個資。</li>
        <li>盜用他人照片或文章。</li>
        <li>用多個帳號哄抬拍賣價格、灌水評價或規避停權。</li>
      </ul>
      <h2>防廣告機制</h2>
      <ul>
        <li>註冊未滿 24 小時的帳號不能張貼連結、上架或出價。</li>
        <li>發文、留言、私訊、上架都有頻率上限。</li>
        <li>同一內容被 3 位不同會員檢舉會先自動隱藏，由版主審核後決定還原或維持。</li>
      </ul>
      <h2>檢舉與處置</h2>
      <p>每篇文章、留言、商品、會員頁與交易單都有「檢舉」按鈕。版主會視情節隱藏內容、停權 1 天到永久。被處置的內容作者會收到通知與原因。</p>
      <h2>交易</h2>
      <p>
        交易另有專門的規範，請見<Link href="/market/guide" className="text-accent underline">交易注意事項</Link>。
      </p>
      <h2>採集與保育</h2>
      <p>分享採集紀錄時，請遵守各保護區的規定，不公開保育類的確切棲地位置，不過量採集。</p>
    </Doc>
  );
}
