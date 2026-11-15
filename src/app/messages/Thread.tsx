"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage, extOf } from "@/lib/image-compress";
import { formatDateTime } from "@/lib/format";
import { RichText } from "@/components/RichText";
import { markRead, sendMessage } from "./actions";

export type Msg = { id: number; sender_id: string; body: string; image_path: string | null; created_at: string; read_at: string | null };

// 疑似在私訊談匯款：出現長串數字（像帳號）或匯款相關字樣時提醒雙方回到交易單
const SCAM = /(\d[\d\s-]{9,18}\d)|匯款|轉帳|帳號|戶名|銀行代碼|私下交易|加\s*(line|賴)|line\s*id|無卡|驗證碼/i;

function PrivateImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    createClient()
      .storage.from("private")
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="size-40 animate-pulse rounded-lg bg-line" />;
  return (
    <a href={url} target="_blank" rel="noopener">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="圖片" className="max-h-64 max-w-full rounded-lg" />
    </a>
  );
}

export function Thread({
  conversationId,
  meId,
  other,
  initial,
  prefill = "",
}: {
  conversationId: number | null;
  meId: string;
  other: { id: string; username: string };
  initial: Msg[];
  prefill?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState(prefill);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  useEffect(() => {
    if (!conversationId) return;
    markRead(conversationId);
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      // 私訊受 RLS 保護：訂閱前先把登入者的 token 交給 Realtime，否則會以未登入身分訂閱而收不到
      await supabase.realtime.setAuth();
      if (cancelled) return;
      ch = supabase
        .channel(`conv-${conversationId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          const m = payload.new as Msg;
          if (!m?.id) return;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
          if (payload.eventType === "INSERT" && m.sender_id !== meId) markRead(conversationId);
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (ch) supabase.removeChannel(ch);
    };
  }, [conversationId, meId]);

  function send(body: string, imagePath: string | null) {
    setError(null);
    start(async () => {
      const res = await sendMessage(other.id, body, imagePath);
      if (!res.ok) return setError(res.error);
      setText("");
      if (!conversationId) router.replace(`/messages/${res.data.conversationId}`);
      else {
        // Realtime 會補上；若連線中斷則重新整理取得
        setTimeout(() => router.refresh(), 1500);
      }
    });
  }

  async function onImage(f?: File) {
    if (!f) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const blob = await compressImage(f);
      const path = `${meId}/dm-${crypto.randomUUID()}.${extOf(blob)}`;
      const { error: upErr } = await supabase.storage.from("private").upload(path, blob, { contentType: blob.type });
      if (upErr) throw new Error("圖片上傳失敗");
      send("", path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "圖片上傳失敗");
    }
    setUploading(false);
    if (file.current) file.current.value = "";
  }

  const suspicious = msgs.some((m) => SCAM.test(m.body)) || SCAM.test(text);

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-1.25rem)] max-w-xl flex-col sm:h-[calc(100dvh-10rem)]">
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <Link href="/messages" aria-label="返回" className="btn btn-ghost btn-sm px-2">
          ‹
        </Link>
        <Link href={`/u/${other.id}`} className="font-semibold">
          {other.username}
        </Link>
      </div>
      {suspicious && (
        <p role="alert" className="notice notice-danger mt-2 text-[13px]">
          <strong>小心詐騙：</strong>對話中出現疑似匯款或帳號的內容。付款資訊只會出現在站內交易單，請不要依私訊提供的帳號匯款，也不要離開交易單私下交易。
          <Link href="/orders" className="ml-1 underline">
            前往我的交易
          </Link>
        </p>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto py-3" aria-live="polite">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-sub">傳送第一則訊息開始對話</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[15px] ${mine ? "bg-accent text-white [&_a]:text-white" : "bg-wash"}`}>
                {m.image_path && <PrivateImage path={m.image_path} />}
                {m.body && <RichText text={m.body} />}
                <div className={`mt-0.5 text-right text-[10px] ${mine ? "text-white/70" : "text-faint"}`} suppressHydrationWarning>
                  {formatDateTime(m.created_at).slice(5)}
                  {mine && m.read_at && "・已讀"}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {error && (
        <p role="alert" className="mb-1 text-xs text-danger">
          {error}
        </p>
      )}
      <form
        className="flex items-end gap-2 border-t border-line pt-2 pb-[env(safe-area-inset-bottom)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send(text, null);
        }}
      >
        <button type="button" aria-label="傳送圖片" className="btn px-3" disabled={uploading || pending} onClick={() => file.current?.click()}>
          {uploading ? "…" : "＋"}
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onImage(e.target.files?.[0])} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={2000}
          placeholder="輸入訊息"
          aria-label="訊息"
          className="input field-sizing-content max-h-32 min-h-11 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              if (text.trim()) send(text, null);
            }
          }}
        />
        <button className="btn btn-primary" disabled={pending || !text.trim()}>
          傳送
        </button>
      </form>
    </div>
  );
}
