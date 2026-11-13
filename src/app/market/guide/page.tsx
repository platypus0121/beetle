import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "交易注意事項",
  description: "上架與購買前必讀：保育類禁售、台灣產活體飼育證明、活體寄送、到貨死亡處理、付款紀錄與防詐騙。",
};

export default async function GuidePage() {
  const supabase = await createClient();
  const { data: protectedSpecies } = await supabase.from("species").select("id, common_name, scientific_name").eq("is_protected", true).order("id");
  return (
    <article className="mx-auto max-w-2xl space-y-7 text-[15px] leading-relaxed">
      <header>
        <h1 className="page-title">交易注意事項</h1>
        <p className="mt-1 text-sm text-sub">上架、下單、出價前都需要勾選已閱讀本頁。</p>
      </header>

      <Section n="1" title="禁止交易的項目">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>保育類野生動物</strong>：依《野生動物保育法》，保育類不得買賣、陳列或展示，活體、標本、卵與產製品都一樣。本站在上架時就會擋下，也不能刊登徵求。目前物種表標記為保育類的有：
            <ul className="mt-1 space-y-0.5">
              {(protectedSpecies ?? []).map((s) => (
                <li key={s.id}>
                  <Link href={`/species/${s.id}`} className="text-accent">
                    {s.common_name}
                  </Link>{" "}
                  <span className="sci text-sub">{s.scientific_name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-sub">名單以主管機關最新公告為準；即使物種表尚未標記，只要是公告的保育類一律禁止。</p>
          </li>
          <li>在國家公園、自然保留區、野生動物保護區等禁止採集的區域取得的個體。</li>
          <li>未依規定申報檢疫、來源不明的輸入活體。</li>
          <li>與甲蟲及其飼育無關的商品、任何廣告或導流到站外的刊登。</li>
        </ul>
      </Section>

      <Section n="2" title="台灣產活體需附飼育證明">
        <p>
          產地為台灣的活體（成蟲、幼蟲、蛹、卵）上架時必須上傳飼育證明，沒有就無法送出。目的是確認個體來自人工累代繁殖，而不是從野外大量採集來販售。
        </p>
        <p className="mt-2">可接受的證明：累代繁殖紀錄（本站「飼育紀錄」的截圖即可）、親蟲與產卵／幼蟲的照片、原始購買憑證。證明只有你和站方看得到，商品頁只會顯示「已附飼育證明」。</p>
      </Section>

      <Section n="3" title="商品資訊怎麼填">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>學名</strong>：選擇物種後自動帶入。亞種、產地不同價差很大，請選到正確的亞種。
          </li>
          <li>
            <strong>產地</strong>：盡量寫到島嶼或地區，例如「印尼 蘇門答臘 明古魯」。
          </li>
          <li>
            <strong>累代</strong>：WD（野外採集個體）、WF1（WD 的第一代子代）、F2、F3…；CB／CBF1（人工繁殖、累代不明）。不確定就寫「不明」，不要亂填。
          </li>
          <li>
            <strong>羽化日、尺寸</strong>：成蟲請據實填寫。尺寸以游標卡尺量測，鍬形蟲含大顎、兜蟲含胸角。
          </li>
          <li>照片請拍實際要賣的個體，瑕疵（斷符節、凹翅、羽化不全）要拍出來並寫在說明。</li>
        </ul>
      </Section>

      <Section n="4" title="活體寄送">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>選擇隔日到的寄送方式，避開週五、連假前一天寄出，以免在貨運站過夜或過週末。</li>
          <li>夏季高溫、寒流期間請加保冷劑或保溫包，並用保麗龍箱；不確定就延後寄。</li>
          <li>成蟲用加了濕木屑或濕紙巾的小盒固定；幼蟲連同原本的木屑／菌瓶寄送，避免途中更換環境。</li>
          <li>寄出後在交易單填寫物流單號，並提醒買家收件時錄影。</li>
        </ul>
      </Section>

      <Section n="5" title="到貨死亡怎麼處理">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>收件時請錄開箱影片</strong>：從包裹未拆封、看得到託運單開始，一刀未剪拍到打開容器、確認個體狀況為止。
          </li>
          <li>
            發現到貨死亡，請在<strong>確認收貨之前</strong>到交易單提出「到貨死亡申訴」並上傳影片（最長 3 分鐘）。<strong>沒有開箱影片無法受理。</strong>
          </li>
          <li>站方會查看影片、交易單時間軸與雙方說明後裁決。一般原則：包裝明顯不當或寄出時已異常，由賣家負責；物流延誤、買家未及時收件等情況則視個案判定。</li>
          <li>影片只有買賣雙方與站方看得到，交易結束 90 天後自動刪除。</li>
          <li>出貨滿 7 天買家沒有確認收貨也沒有申訴，系統會自動完成交易。</li>
        </ul>
      </Section>

      <Section n="6" title="付款與交易紀錄">
        <p>
          <strong>本站不代收、不代付、不經手任何款項。</strong>買賣雙方以轉帳或面交自行付款，但每一步都要記錄在站內交易單，發生糾紛時站方才有依據。
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong>收款帳戶只會出現在交易單裡。</strong>賣家在交易單填寫，只有該筆交易的買賣雙方看得到。任何人在私訊給你匯款帳號，都請直接拒絕並檢舉。
          </li>
          <li>買家付款後在交易單回報金額、時間與帳號末五碼，可附轉帳截圖；賣家確認收款後才出貨。</li>
          <li>交易單的時間軸記錄誰、在什麼時候、做了什麼，任何人都無法修改或刪除。</li>
          <li>下單被接受或拍賣得標後，買家需在 3 天內付款並回報。逾期未付款會被記棄標一次、扣信用分 10 分；棄標達 3 次停止出價權限。</li>
          <li>交易完成後雙方互相評價，評價與信用分會公開顯示在個人頁。</li>
        </ul>
      </Section>

      <Section n="7" title="拍賣規則">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>出價時填的是「你願意出的最高金額」，系統只會用剛好贏過別人的最低價替你出價，上限不公開。</li>
          <li>結標前 5 分鐘內有人出價，結標時間自動延長 5 分鐘。</li>
          <li>賣家可設不公開的底價，最高出價未達底價則流標。</li>
          <li>出價不能撤回。得標即成立交易，請確定要買再出價。</li>
          <li>賣家不得用其他帳號或請人哄抬價格，查獲即停權。</li>
        </ul>
      </Section>

      <Section n="8" title="防詐騙">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>付款前先看賣家的信用分、評價、完成交易數與註冊時間。新帳號、零評價、價格又明顯低於行情時要特別小心。</li>
          <li>不要因為對方說「私下交易比較便宜」就離開交易單；沒有交易單，站方無法協助。</li>
          <li>交易單裡的收款帳戶若和賣家以往使用的不同，系統會提醒，請向賣家確認。</li>
          <li>面交請選白天、人多的公共場所，當場確認個體再付款。</li>
          <li>不要提供驗證碼、提款卡或網銀帳密給任何人。本站不會以任何理由要求你操作 ATM。</li>
          <li>懷疑遇到詐騙：保留紀錄、在交易單提出申訴或檢舉，並撥打 165 反詐騙專線。</li>
        </ul>
      </Section>

      <p className="notice">
        本站僅提供刊登、媒合與交易紀錄的功能，不是買賣契約的當事人，不保證商品品質或交易一定完成。站方的裁決只影響站內的交易狀態與信用分，不代表法律上的責任認定。
      </p>
    </article>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`s${n}`}>
      <h2 className="mb-2 text-[17px] font-semibold">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
