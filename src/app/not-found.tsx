import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="text-4xl font-semibold text-faint">404</p>
      <h1 className="mt-2 text-lg font-semibold">找不到這個頁面</h1>
      <p className="mt-1 text-sm text-sub">內容可能已被刪除、設為不公開，或你沒有權限查看。</p>
      <Link href="/" className="btn btn-primary mt-5">
        回首頁
      </Link>
    </div>
  );
}
