// Cloudflare Stream 播放器。token 有值時代表需簽名網址的私有影片（開箱影片）。
export function StreamPlayer({ uid, token }: { uid: string; token?: string }) {
  const customer = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER;
  const id = token ?? uid;
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return null;
  const src = customer
    ? `https://customer-${customer}.cloudflarestream.com/${id}/iframe`
    : `https://iframe.videodelivery.net/${id}`;
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <iframe src={src} title="影片" loading="lazy" allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen" className="size-full" />
    </div>
  );
}
