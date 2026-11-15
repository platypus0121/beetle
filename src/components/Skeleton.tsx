// 換頁時的灰色骨架：形狀跟真實版面一致，載入完成時畫面不會跳動。
// 只放在不會呼叫 notFound() 的列表頁（route group 的 loading.tsx），
// 避免詳細頁的 404 因為串流提早開始而變成 200。

export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

function Busy({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-label="載入中" aria-busy className={className}>
      {children}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="flex gap-3 border-b border-line py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-1.5">
          <Bone className="h-5 w-10 rounded-full" />
          <Bone className="h-5 w-16 rounded-full" />
        </div>
        <Bone className="h-5 w-4/5" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-2/3" />
        <Bone className="h-3.5 w-1/3" />
      </div>
      <Bone className="size-20 shrink-0 rounded-lg sm:size-24" />
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Bone className="aspect-[4/3] rounded-none" />
      <div className="space-y-1.5 p-2.5">
        <Bone className="h-4 w-full" />
        <Bone className="h-3.5 w-2/3" />
        <Bone className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function RowSkeleton({ avatar = true }: { avatar?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3.5">
      {avatar && <Bone className="size-10 shrink-0 rounded-full" />}
      <div className="min-w-0 flex-1 space-y-2">
        <Bone className="h-4 w-1/2" />
        <Bone className="h-3.5 w-4/5" />
      </div>
    </div>
  );
}

export function TitleSkeleton() {
  return <Bone className="mb-5 h-7 w-32" />;
}

export function TabsSkeleton({ n = 3 }: { n?: number }) {
  return (
    <div className="-mx-4 mb-4 flex gap-4 border-b border-line px-4 pb-3">
      {Array.from({ length: n }, (_, i) => (
        <Bone key={i} className="h-5 w-12" />
      ))}
    </div>
  );
}

export function FeedSkeleton({ n = 5 }: { n?: number }) {
  return (
    <Busy>
      {Array.from({ length: n }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </Busy>
  );
}

export function ListSkeleton({ n = 6, width = "max-w-2xl", avatar = true, tabs = 0 }: { n?: number; width?: string; avatar?: boolean; tabs?: number }) {
  return (
    <Busy className={`mx-auto ${width}`}>
      <TitleSkeleton />
      {tabs > 0 && <TabsSkeleton n={tabs} />}
      {Array.from({ length: n }, (_, i) => (
        <RowSkeleton key={i} avatar={avatar} />
      ))}
    </Busy>
  );
}

export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <Busy>
      <TitleSkeleton />
      <Bone className="mb-4 h-11 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: n }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </Busy>
  );
}
