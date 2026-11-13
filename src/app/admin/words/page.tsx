import { createClient } from "@/lib/supabase/server";
import { WordForm } from "../AdminForms";

export default async function WordsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("banned_words").select("word").order("word");
  return (
    <div className="space-y-4">
      <h1 className="page-title">禁用詞</h1>
      <p className="text-sm text-sub">文章、留言、商品、徵求、私訊與評價只要包含下列任一詞，資料庫就會拒絕寫入。版主自己的內容不受限。</p>
      <WordForm />
      <div className="flex flex-wrap gap-2">
        {(data ?? []).map((w) => (
          <WordForm key={w.word} word={w.word} />
        ))}
      </div>
    </div>
  );
}
